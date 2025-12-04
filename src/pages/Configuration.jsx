import React, { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { Table, Button, Tabs, Tab, Modal, Form, Card, Row, Col, Spinner, Image } from "react-bootstrap";
import { Trash, Pencil, PersonBadge, Briefcase, Clock, PlusCircle, Upload, Palette, CheckCircleFill } from "react-bootstrap-icons";
import { useAuth } from "../contexts/AuthContext";
import { getMyBusiness, getCollection, saveDocument, deleteDocument, updateDocument, uploadLogo, uploadResourcePhoto } from "../services/dbService";
import Swal from 'sweetalert2';
import { useSector } from "../hooks/useSector";
import { useTheme } from "../contexts/ThemeContext";
import { THEMES } from "../config/themes";

// Generador de horarios (Helpers)
const generateTimeSlots = () => {
  const slots = [];
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    slots.push(`${hour}:00`);
    slots.push(`${hour}:30`);
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function Configuration() {
  const { currentUser } = useAuth();
  const { refreshTheme } = useTheme()

  // Estados de Datos
  const [tenant, setTenant] = useState(null);
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);
  const [schedule, setSchedule] = useState({});

  // Hook de Sector (Personalización de etiquetas)
  const sector = useSector(tenant);

  // Estados de UI
  const [loadingData, setLoadingData] = useState(true); // Carga inicial de página
  const [processing, setProcessing] = useState(false);  // Procesando formulario/acción

  // Estados del Modal
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'service' | 'resource'
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Estados del Formulario
  const [formData, setFormData] = useState({});
  const [resourceFile, setResourceFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // Para previsualizar imagen seleccionada

  const [selectedThemeId, setSelectedThemeId] = useState('dark')

  // --- CARGA DE DATOS ---
  useEffect(() => {
    async function init() {
      if (currentUser) {
        try {
          const business = await getMyBusiness(currentUser.uid, currentUser.email);
          setTenant(business);
          if (business) {
            await refreshData(business.id);
            if (business.openingHours) setSchedule(business.openingHours);
            if (business.theme) setSelectedThemeId(business.theme);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoadingData(false);
        }
      }
    }
    init();
  }, [currentUser]);

  const refreshData = async (tenantId) => {
    const s = await getCollection("services", tenantId);
    const r = await getCollection("resources", tenantId);
    setServices(s);
    setResources(r);
  };

  // --- HANDLERS DE FORMULARIO ---

  // Abrir Modal (Crear)
  const openModal = (type) => {
    setModalType(type);
    setIsEditing(false);
    setEditId(null);
    setFormData({});
    setResourceFile(null);
    setPreviewUrl(null);
    setShowModal(true);
  };

  // Abrir Modal (Editar)
  const handleEdit = (item, type) => {
    setModalType(type);
    setIsEditing(true);
    setEditId(item.id);

    // Rellenar formulario
    setFormData({
      name: item.name || "",
      description: item.description || "",
      price: item.price || "",
      duration: item.duration || "",
      photoUrl: item.photoUrl || "" // Guardamos la URL existente
    });

    setResourceFile(null);
    setPreviewUrl(item.photoUrl || null); // Mostrar foto actual si existe
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setFormData({});
    setResourceFile(null);
    setPreviewUrl(null);
  };

  // Previsualización de imagen al seleccionar archivo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return Swal.fire('Archivo muy grande', 'La imagen debe pesar menos de 2MB', 'warning');
      }
      setResourceFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Crea URL temporal para mostrar
    }
  };

  // Guardar (Crear o Editar)
  const handleSave = async (e) => {
    e.preventDefault();

    // Validación de seguridad
    if (!tenant) return Swal.fire('Error', 'No se ha cargado la información del negocio.', 'error');
    if (!formData.name) return Swal.fire('Atención', 'El nombre es obligatorio', 'warning');

    setProcessing(true);
    try {
      const isService = modalType === "service";
      const collectionName = isService ? "services" : "resources";

      let dataToSave = {
        ...formData,
        tenantId: tenant.id,
        price: isService ? Number(formData.price) : 0,
        duration: isService ? Number(formData.duration) : 0,
        description: formData.description || ""
      };

      // Subir imagen si se seleccionó una nueva
      if (!isService && resourceFile) {
        const photoUrl = await uploadResourcePhoto(resourceFile, tenant.id);
        dataToSave.photoUrl = photoUrl;
      } else if (!isService && isEditing && formData.photoUrl) {
        // Mantener la foto vieja si no se subió una nueva
        dataToSave.photoUrl = formData.photoUrl;
      }

      if (isEditing) {
        await updateDocument(collectionName, editId, dataToSave);
      } else {
        await saveDocument(collectionName, dataToSave);
      }

      await refreshData(tenant.id);
      handleClose();

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Actualizado correctamente' : 'Creado correctamente',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un problema al guardar.', 'error');
    }
    setProcessing(false);
  };

  // Borrar
  const handleDelete = async (collectionName, id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await deleteDocument(collectionName, id);
        await refreshData(tenant.id); // Recargar lista
        Swal.fire('Eliminado', 'El elemento ha sido borrado.', 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo eliminar.', 'error');
      }
    }
  };

  // --- HANDLERS DE HORARIOS ---
  const handleScheduleChange = (dayIndex, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: {
        ...prev[dayIndex],
        [field]: value
      }
    }));
  };

  const handleSaveSchedule = async () => {
    setProcessing(true);
    try {
      await updateDocument("tenants", tenant.id, { openingHours: schedule });
      Swal.fire({
        icon: 'success',
        title: 'Horarios actualizados',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron guardar los horarios', 'error');
    }
    setProcessing(false);
  };

  //--- HANDLER THEME ---
  const handleSaveTheme = async () => {
    setProcessing(true)
    try {
      await updateDocument('tenants', tenant.id, { theme: selectedThemeId })
      await refreshTheme()

      setTenant(prev => ({ ...prev, theme: selectedThemeId }))

      Swal.fire({
        icon: 'success',
        title: 'Tema actualizado',
        text: 'Panel actaulizado',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'no se guardo el tema', 'error')
    }
    setProcessing(false)
  }

  if (loadingData) return <MainLayout><div className="p-5 text-center">Cargando...</div></MainLayout>;

  // --- HANDLER DE LOGO ---
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      return Swal.fire('Error', 'La imagen es muy pesada (MAX 2MB)', 'warning');
    }

    setProcessing(true);
    try {
      const url = await uploadLogo(file, tenant.id);
      await updateDocument('tenants', tenant.id, { logoUrl: url });

      // Actualizamos estado local para ver el cambio inmediatamente
      setTenant(prev => ({ ...prev, logoUrl: url }));

      Swal.fire({
        icon: 'success',
        title: 'Logo actualizado',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo subir el logo', 'error');
    }
    setProcessing(false);
  };


  // --- RENDER ---
  if (loadingData) {
    return (
      <MainLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-0">Configuración</h2>
          <p className="text-muted mb-0">Administra los detalles de tu negocio</p>
        </div>
      </div>

      {/* TARJETA DE IDENTIDAD (LOGO) */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <h5 className="fw-bold mb-3">Identidad del Negocio</h5>
          <div className="d-flex align-items-center flex-column flex-md-row gap-4">
            <div className="position-relative">
              <div
                className="rounded-circle border d-flex align-items-center justify-content-center bg-light overflow-hidden"
                style={{ width: 100, height: 100 }}
              >
                {tenant?.logoUrl ? (
                  <Image src={tenant.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="text-muted fs-1">📷</span>
                )}
              </div>
              {/* Botón flotante para subir foto */}
              <div className="position-absolute bottom-0 end-0">
                <label htmlFor="logo-upload" className="btn btn-sm btn-primary rounded-circle shadow-sm" style={{ cursor: 'pointer' }}>
                  <Pencil size={12} />
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="d-none"
                  onChange={handleLogoUpload}
                  disabled={processing}
                />
              </div>
            </div>

            <div className="flex-grow-1">
              <h4 className="fw-bold text-dark">{tenant?.name || "Mi Negocio"}</h4>
              <p className="text-muted small mb-0">
                Este logo aparecerá en tu página de reservas pública. <br />
                Recomendamos una imagen cuadrada (JPG/PNG) de menos de 2MB.
              </p>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* TABS PRINCIPALES */}


      <Tabs defaultActiveKey="appearence" className="mb-4 custom-tabs border-bottom-0">

        {/* --- TAB: APARICIENCIA ---  */}
        <Tab eventKey="appearance" title={<span><Palette className="me-2" /> Apariencia</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold m-0 text-primary">Tema Visual</h6>
                <small className="text-muted">Elige los colores de tu panel.</small>
              </div>
              <Button variant="primary" onClick={handleSaveTheme} disabled={processing}>
                {processing ? <Spinner size="sm" /> : "Aplicar Tema"}
              </Button>
            </Card.Header>
            <Card.Body>
              <Row className="g-4">
                {Object.values(THEMES).map((themeOption) => (
                  <Col xs={12} md={4} key={themeOption.id}>
                    <div
                      className={`border rounded p-3 cursor-pointer position-relative h-100 ${selectedThemeId === themeOption.id ? 'border-primary border-2 bg-light' : ''}`}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                      onClick={() => setSelectedThemeId(themeOption.id)}
                    >
                      {selectedThemeId === themeOption.id && (
                        <div className="position-absolute top-0 end-0 p-2 text-primary">
                          <CheckCircleFill size={24} />
                        </div>
                      )}

                      <h6 className="fw-bold mb-3">{themeOption.name}</h6>

                      {/* Miniatura visual del tema */}
                      <div className="d-flex border rounded overflow-hidden" style={{ height: '100px' }}>
                        {/* Sidebar Mini */}
                        <div style={{ width: '30%', backgroundColor: themeOption.sidebarBg, display: 'flex', flexDirection: 'column', padding: '5px' }}>
                          <div className="rounded mb-1" style={{ height: '6px', width: '60%', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
                          <div className="rounded mb-1" style={{ height: '4px', width: '80%', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
                          <div className="rounded" style={{ height: '4px', width: '80%', backgroundColor: themeOption.activeItem, marginTop: '10px' }}></div>
                        </div>
                        {/* Content Mini */}
                        <div style={{ width: '70%', backgroundColor: themeOption.mainBg, padding: '10px' }}>
                          <div className="bg-white rounded shadow-sm w-100 h-100"></div>
                        </div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        {/* --- TAB 1: SERVICIOS --- */}
        <Tab eventKey="services" title={<span><Briefcase className="me-2" /> {sector.serviceLabel}s</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom-0">
              <h6 className="fw-bold m-0 text-primary">Listado de Servicios</h6>
              <Button variant="primary" size="sm" onClick={() => openModal("service")}>
                <PlusCircle className="me-2" /> Nuevo {sector.serviceLabel}
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="ps-4">Nombre</th>
                    <th>Duración</th>
                    <th>Precio</th>
                    <th className="text-end pe-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id}>
                      <td className="ps-4 fw-bold text-dark">{s.name}</td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          <Clock className="me-1" /> {s.duration} min
                        </span>
                      </td>
                      <td className="fw-bold text-success">${s.price}</td>
                      <td className="text-end pe-4">
                        <Button variant="link" className="text-primary p-1 me-2" onClick={() => handleEdit(s, "service")}>
                          <Pencil />
                        </Button>
                        <Button variant="link" className="text-danger p-1" onClick={() => handleDelete("services", s.id)}>
                          <Trash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {services.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-5 text-muted">Aún no has creado servicios.</td></tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* --- TAB 2: RECURSOS (Equipo) --- */}
        <Tab eventKey="team" title={<span><PersonBadge className="me-2" /> {sector.resourceLabel}s</span>}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom-0">
              <h6 className="fw-bold m-0 text-primary">Equipo de Trabajo</h6>
              <Button variant="success" size="sm" onClick={() => openModal("resource")}>
                <PlusCircle className="me-2" /> Nuevo {sector.resourceLabel}
              </Button>
            </Card.Header>
            <Card.Body>
              <Row className="g-4">
                {resources.map(r => (
                  <Col key={r.id} xs={12} md={6} lg={4}>
                    <Card className="h-100 border shadow-sm resource-card">
                      <Card.Body className="d-flex align-items-center">
                        <div className="me-3">
                          {r.photoUrl ? (
                            <Image src={r.photoUrl} roundedCircle style={{ width: 60, height: 60, objectFit: 'cover' }} />
                          ) : (
                            <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-muted border" style={{ width: 60, height: 60 }}>
                              <PersonBadge size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="fw-bold mb-1">{r.name}</h6>
                          <p className="text-muted small mb-0 text-truncate" style={{ maxWidth: '150px' }}>{r.description || "Sin descripción"}</p>
                        </div>
                        <div className="d-flex flex-column gap-1">
                          <Button variant="outline-primary" size="sm" className="py-0" onClick={() => handleEdit(r, "resource")}><Pencil size={12} /></Button>
                          <Button variant="outline-danger" size="sm" className="py-0" onClick={() => handleDelete("resources", r.id)}><Trash size={12} /></Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
                {resources.length === 0 && (
                  <Col xs={12} className="text-center py-5 text-muted">
                    No hay profesionales registrados.
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        {/* --- TAB 3: HORARIOS --- */}
        <Tab eventKey="hours" title={<span><Clock className="me-2" /> Horarios</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold m-0 text-primary">Horarios de Atención</h6>
                <small className="text-muted">Define cuándo pueden reservar tus clientes.</small>
              </div>
              <Button variant="primary" onClick={handleSaveSchedule} disabled={processing}>
                {processing ? <Spinner as="span" animation="border" size="sm" /> : "Guardar Cambios"}
              </Button>
            </Card.Header>
            <Card.Body>
              {daysOfWeek.map((dayName, index) => {
                const dayConfig = schedule[index] || { isOpen: false, start: '09:00', end: '19:00' };
                return (
                  <Row key={index} className="align-items-center py-3 border-bottom">
                    <Col xs={4} md={3}>
                      <div className="fw-bold text-dark">{dayName}</div>
                    </Col>

                    <Col xs={8} md={3}>
                      <Form.Check
                        type="switch"
                        id={`switch-${index}`}
                        label={dayConfig.isOpen ? "Abierto" : "Cerrado"}
                        checked={dayConfig.isOpen}
                        onChange={(e) => handleScheduleChange(index, "isOpen", e.target.checked)}
                        className={dayConfig.isOpen ? "text-success fw-bold" : "text-muted"}
                      />
                    </Col>

                    {dayConfig.isOpen && (
                      <Col xs={12} md={6} className="d-flex align-items-center gap-2 mt-2 mt-md-0 animate-fade-in">
                        <Form.Select
                          size="sm"
                          value={dayConfig.start}
                          onChange={(e) => handleScheduleChange(index, "start", e.target.value)}
                        >
                          {TIME_SLOTS.map(t => <option key={`s-${t}`} value={t}>{t}</option>)}
                        </Form.Select>
                        <span>a</span>
                        <Form.Select
                          size="sm"
                          value={dayConfig.end}
                          onChange={(e) => handleScheduleChange(index, "end", e.target.value)}
                        >
                          {TIME_SLOTS.map(t => <option key={`e-${t}`} value={t}>{t}</option>)}
                        </Form.Select>
                      </Col>
                    )}
                  </Row>
                )
              })}
            </Card.Body>
          </Card>
        </Tab>

      </Tabs>

      {/* --- MODAL UNIFICADO (Servicios / Recursos) --- */}
      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton className={modalType === 'service' ? 'bg-primary text-white' : 'bg-success text-white'}>
          <Modal.Title>
            {isEditing ? "✏️ Editar" : "✨ Nuevo"} {modalType === "service" ? sector.serviceLabel : sector.resourceLabel}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Nombre</Form.Label>
              <Form.Control
                required
                autoFocus
                placeholder={modalType === "service" ? "Ej: Corte Clásico" : "Ej: Juan Pérez"}
                value={formData.name || ""}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </Form.Group>

            {/* CAMPOS ESPECÍFICOS: SERVICIO */}
            {modalType === "service" && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Duración (min)</Form.Label>
                    <Form.Control
                      type="number"
                      required
                      min="1"
                      value={formData.duration || ""}
                      onChange={e => setFormData({ ...formData, duration: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Precio ($)</Form.Label>
                    <Form.Control
                      type="number"
                      required
                      min="0"
                      value={formData.price || ""}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            {/* CAMPOS ESPECÍFICOS: RECURSO */}
            {modalType !== "service" && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Descripción</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Especialidad, bio corta..."
                    value={formData.description || ""}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Foto de Perfil</Form.Label>
                  <div className="d-flex align-items-center gap-3">
                    {previewUrl && (
                      <Image src={previewUrl} roundedCircle style={{ width: 50, height: 50, objectFit: 'cover' }} className="border" />
                    )}
                    <Form.Control
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                </Form.Group>
              </>
            )}

            <div className="d-grid gap-2 mt-4">
              <Button
                type="submit"
                variant={modalType === 'service' ? 'primary' : 'success'}
                disabled={processing}
                size="lg"
              >
                {processing ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

    </MainLayout>
  );
}