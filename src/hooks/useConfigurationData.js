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

// Estado inicial seguro para los horarios (7 días cerrados)
const INITIAL_SCHEDULE = Array(7).fill({
  isOpen: false,
  start: '09:00',
  end: '18:00',
});

export function useConfigurationData(currentUser, refreshTheme) {
  // Estado local
  const [tenant, setTenant] = useState(null);
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);

  // Schedule siempre debe ser un objeto o array válido para evitar crashes
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // --- HELPERS ---
  const refreshSubCollections = useCallback(async (tenantId) => {
    try {
      // Promise.all para cargar en paralelo y más rápido
      const [s, r] = await Promise.all([
        getCollection('services', tenantId),
        getCollection('resources', tenantId),
      ]);
      setServices(s);
      setResources(r);
    } catch (error) {
      console.error('Error refrescando datos:', error);
    }
  }, []);

  // --- INIT ---
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        if (!currentUser) return;

        const business = await getMyBusiness(
          currentUser.uid,
          currentUser.email
        );

        if (isMounted) {
          setTenant(business);

          if (business?.id) {
            await refreshSubCollections(business.id);
            // Si ya tiene horarios guardados, úsalos; si no, usa el default
            if (
              business.openingHours &&
              Object.keys(business.openingHours).length > 0
            ) {
              setSchedule(business.openingHours);
            }
          }
        }
      } catch (error) {
        console.error('Error iniciando configuración:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error de conexión',
          text: 'No pudimos cargar la configuración del negocio.',
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [currentUser, refreshSubCollections]);

  // --- ACTIONS ---

  // 1. SUBIR LOGO
  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return Swal.fire(
        'Archivo muy grande',
        'El logo debe pesar menos de 2MB',
        'warning'
      );
    }

    setProcessing(true);
    try {
      const url = await uploadLogo(file, tenant.id);
      await updateDocument('tenants', tenant.id, { logoUrl: url });

      setTenant((prev) => ({ ...prev, logoUrl: url }));

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      });
      Toast.fire({ icon: 'success', title: 'Logo actualizado' });
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo subir la imagen', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // 2. GUARDAR TEMA
  const handleSaveTheme = async (themeId) => {
    if (tenant.theme === themeId) return; // Evitar guardado innecesario

    setProcessing(true);
    try {
      await updateDocument('tenants', tenant.id, { theme: themeId });

      // Actualizamos contexto global
      if (refreshTheme) await refreshTheme();

      setTenant((prev) => ({ ...prev, theme: themeId }));

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
      });
      Toast.fire({ icon: 'success', title: 'Tema aplicado correctamente' });
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo guardar la configuración visual', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // 3. GUARDAR HORARIOS
  const handleSaveSchedule = async (newSchedule) => {
    setProcessing(true);
    try {
      // Guardamos en Firestore
      await updateDocument('tenants', tenant.id, { openingHours: newSchedule });

      setSchedule(newSchedule);

      Swal.fire({
        icon: 'success',
        title: '¡Horarios actualizados!',
        text: 'Tus clientes ahora verán esta disponibilidad.',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Hubo un problema al guardar los horarios', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // 4. ELIMINAR ITEM (Servicio/Recurso)
  const handleDeleteItem = async (collection, id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        await deleteDocument(collection, id);

        // Actualización optimista local antes de refrescar (para que se sienta rápido)
        if (collection === 'services') {
          setServices((prev) => prev.filter((item) => item.id !== id));
        } else if (collection === 'resources') {
          setResources((prev) => prev.filter((item) => item.id !== id));
        }

        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
        });
        Toast.fire({ icon: 'success', title: 'Eliminado correctamente' });
      } catch (e) {
        console.error(e);
        Swal.fire('Error', 'No se pudo eliminar el elemento', 'error');
      }
    }
  };

  // 5. CREAR O EDITAR ITEM (Servicio/Recurso)
  const handleUpsertItem = async (collection, data, file, isEditing, id) => {
    setProcessing(true);
    try {
      let finalData = {
        ...data,
        tenantId: tenant.id,
        // Aseguramos que los números sean números
        price: data.price ? Number(data.price) : 0,
        duration: data.duration ? Number(data.duration) : 30,
      };

      // Si hay foto nueva (solo recursos)
      if (collection === 'resources' && file) {
        finalData.photoUrl = await uploadResourcePhoto(file, tenant.id);
      }

      if (isEditing) {
        await updateDocument(collection, id, finalData);
      } else {
        await saveDocument(collection, finalData);
      }

      await refreshSubCollections(tenant.id);

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Actualizado' : 'Creado con éxito',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
      });

      return true; // Indica éxito al componente para cerrar modal
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Hubo un problema al guardar los datos', 'error');
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
