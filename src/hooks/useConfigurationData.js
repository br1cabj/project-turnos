import { useState, useEffect, useCallback } from 'react';
import {
  getMyBusiness,
  getCollection,
  saveDocument,
  deleteDocument,
  updateDocument,
  uploadResourcePhoto,
  uploadLogo,
} from '../services/dbService';
import Swal from 'sweetalert2';

export function useConfigurationData(currentUser, refreshTheme) {
  const [tenant, setTenant] = useState(null);
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const refreshSubCollections = useCallback(async (tenantId) => {
    const s = await getCollection('services', tenantId);
    const r = await getCollection('resources', tenantId);
    setServices(s);
    setResources(r);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const business = await getMyBusiness(
          currentUser.uid,
          currentUser.email
        );
        setTenant(business);
        if (business) {
          await refreshSubCollections(business.id);
          if (business.openingHours) setSchedule(business.openingHours);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      init();
    }
  }, [currentUser, refreshSubCollections]);

  // --- ACTIONS ---
  const handleLogoUpload = async (file) => {
    if (!file || file.size > 2 * 1024 * 1024)
      return Swal.fire('Error', 'Máx 2MB', 'warning');
    setProcessing(true);
    try {
      const url = await uploadLogo(file, tenant.id);
      await updateDocument('tenants', tenant.id, { logoUrl: url });
      setTenant((prev) => ({ ...prev, logoUrl: url }));
      Swal.fire('Éxito', 'Logo actualizado', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Falló la subida', 'error');
    }
    setProcessing(false);
  };

  const handleSaveTheme = async (themeId) => {
    setProcessing(true);
    try {
      await updateDocument('tenants', tenant.id, { theme: themeId });
      await refreshTheme();
      setTenant((prev) => ({ ...prev, theme: themeId }));
      Swal.fire({
        icon: 'success',
        title: 'Tema actualizado',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire('Error', 'No se guardó el tema', 'error');
    }
    setProcessing(false);
  };

  const handleSaveSchedule = async (newSchedule) => {
    setProcessing(true);
    try {
      await updateDocument('tenants', tenant.id, { openingHours: newSchedule });
      setSchedule(newSchedule);
      Swal.fire({
        icon: 'success',
        title: 'Horarios guardados',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire('Error', 'Falló al guardar horarios', 'error');
    }
    setProcessing(false);
  };

  const handleDeleteItem = async (collection, id) => {
    const res = await Swal.fire({
      title: '¿Borrar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
    });
    if (res.isConfirmed) {
      try {
        await deleteDocument(collection, id);
        await refreshSubCollections(tenant.id);
        Swal.fire('Eliminado', '', 'success');
      } catch (e) {
        Swal.fire('Error', 'No se pudo eliminar', 'error');
      }
    }
  };

  const handleUpsertItem = async (collection, data, file, isEditing, id) => {
    setProcessing(true);
    try {
      let finalData = { ...data, tenantId: tenant.id };

      if (collection === 'resources' && file) {
        finalData.photoUrl = await uploadResourcePhoto(file, tenant.id);
      }

      if (isEditing) {
        await updateDocument(collection, id, finalData);
      } else {
        await saveDocument(collection, finalData);
      }

      await refreshSubCollections(tenant.id);
      Swal.fire('Éxito', isEditing ? 'Actualizado' : 'Creado', 'success');
      return true;
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Hubo un problema al guardar', 'error');
      return false;
    } finally {
      setProcessing(false);
    }
  };

  return {
    tenant,
    services,
    resources,
    schedule,
    loading,
    processing,
    handleLogoUpload,
    handleSaveTheme,
    handleSaveSchedule,
    handleDeleteItem,
    handleUpsertItem,
    setSchedule,
  };
}
