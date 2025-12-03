import React, { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { Table, Button, Tabs, Tab, Modal, Form, Card, Alert, Row, Col } from "react-bootstrap";
import { Trash, Plus, PersonBadge, Scissors, Clock } from "react-bootstrap-icons";
import { useAuth } from "../contexts/AuthContext";
import { getMyBusiness, getCollection, saveDocument, deleteDocument, updateDocument, uploadLogo, } from "../services/dbService";
import Swal from 'sweetalert2'
import { useSector } from "../hooks/useSector";

//HORARIOS!!!!
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

export default function Configuration() {
  const { currentUser } = useAuth();
  const [tenant, setTenant] = useState(null);

  //Datos
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);

  //Estados de carga
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('')

  //FORMULARIO
  const [formData, setFormData] = useState({})

  const [schedule, setSchedule] = useState({
    0: { isOpen: false, start: "09:00", end: "13:00" }, // Dom
    1: { isOpen: true, start: "09:00", end: "19:00" }, // Lun
    2: { isOpen: true, start: "09:00", end: "19:00" }, // Mar
    3: { isOpen: true, start: "09:00", end: "19:00" }, // Mié
    4: { isOpen: true, start: "09:00", end: "19:00" }, // Jue
    5: { isOpen: true, start: "09:00", end: "19:00" }, // Vie
    6: { isOpen: true, start: "09:00", end: "14:00" }, // Sáb
  });

  const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const refreshData = async (tenantId) => {
    const s = await getCollection("services", tenantId);
    const r = await getCollection("resources", tenantId);
    setServices(s);
    setResources(r);
  }

  const sector = useSector(tenant)


  useEffect(() => {
    async function init() {
      if (currentUser) {
        const business = await getMyBusiness(currentUser.uid, currentUser.email);
        setTenant(business);
        if (business) {
          refreshData(business.id);
          if (business.openingHours) {
            setSchedule(business.openingHours)
          }
        }
      }
    }
    init();
  }, [currentUser]);

  //Manejo de guardado
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {

      const isService = modalType === 'service';
      const collectionName = isService ? 'services' : 'resources';

      const dataToSave = {
        ...formData,
        tenantId: tenant.id,
        price: isService ? Number(formData.price) : 0,
        duration: isService ? Number(formData.duration) : 0
      }

      await saveDocument(collectionName, dataToSave);
      await refreshData(tenant.id);
      setShowModal(false);
      setFormData({});


    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo guardar los datos', 'error');
    }
    setLoading(false);
  }

  //MANEJO DE BORRADO
  const handleDelete = async (collectionName, id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esto.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      await deleteDocument(collectionName, id);
      await refreshData(tenant.id);

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      Toast.fire({ icon: 'success', title: 'Eliminado correctamente' });
    }
  };

  //handle horarios
  const handleSaveSchedule = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const handleScheduleChange = (dayIndex, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value }
    }));
  };

  const openModal = (type) => {
    setModalType(type);
    setFormData({});
    setShowModal(true);
  };

  //handle logo
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      return Swal.fire('Error', 'La imagen es muy pesada(MAX 2MB)', 'error')
    }

    setLoading(true)
    try {
      const url = await uploadLogo(file, tenant.id)

      await updateDocument('tenants', tenant.id, { logoUrl: url })
      setTenant(prev => ({ ...prev, logoUrl: url }))
      Swal.fire('¡Genial!', 'Logo actualizado correctamente', 'success');
    } catch (error) {
      console.error(error)
      Swal.fire('Error', 'No se pudo subir la imagen', 'error');
    }
    setLoading(false)
  }



  return (
    <MainLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Configuración</h2>
        <span className="text-muted">{tenant?.name}</span>
      </div>

      <Card className="border-0 shadow-sm mb-4 p-3">
        <div className="d-flex align-items-center">
          {/* Previsualización */}
          <div
            className="border rounded-circle me-3 d-flex align-items-center justify-content-center bg-light"
            style={{ width: 80, height: 80, overflow: 'hidden' }}
          >
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span className="text-muted fs-4">📷</span>
            )}
          </div>

          <div>
            <h6 className="fw-bold">Logo del Negocio</h6>
            <Form.Control
              type="file"
              size="sm"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={loading}
            />
            <Form.Text className="text-muted">Recomendado: JPG o PNG cuadrado.</Form.Text>
          </div>
        </div>
      </Card>

      <Tabs defaultActiveKey="services" className="mb-3 custom-tabs">

        {/* --- TAB 1: SERVICIOS --- */}
        <Tab eventKey="services" title={<span><Scissors className="me-2" /> Servicios</span>}>
          <Card className="border-0 shadow-sm p-3">
            <div className="d-flex justify-content-end mb-3">
              <Button onClick={() => openModal("service")}>+ Nuevo Servicio</Button>
            </div>
            <Table hover responsive>
              <thead className="bg-light">
                <tr>
                  <th>Nombre</th>
                  <th>Duración</th>
                  <th>Precio</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id}>
                    <td className="fw-bold">{s.name}</td>
                    <td>{s.duration} min</td>
                    <td>${s.price}</td>
                    <td className="text-end">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete("services", s.id)}
                      >
                        <Trash />
                      </Button>
                    </td>
                  </tr>
                ))}
                {services.length === 0 && <tr><td colSpan="4" className="text-center">No hay servicios</td></tr>}
              </tbody>
            </Table>
          </Card>
        </Tab>

        {/* --- TAB 2: EQUIPO --- */}
        <Tab eventKey="team" title={<span><PersonBadge className="me-2" /> Mi Equipo</span>}>
          <Card className="border-0 shadow-sm p-3">
            <div className="d-flex justify-content-end mb-3">
              <Button variant="success" onClick={() => openModal("resource")}>+ {sector.actionLabel}</Button>
            </div>
            <div className="d-flex flex-wrap gap-3">
              {resources.map(r => (
                <Card key={r.id} style={{ width: '18rem' }} className="border shadow-sm">
                  <Card.Body className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">{r.name}</h5>
                      <span className="badge bg-primary">Activo</span>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete("resources", r.id)}
                    >
                      <Trash />
                    </Button>
                  </Card.Body>
                </Card>
              ))}
              {resources.length === 0 && <p>No has cargado empleados aún.</p>}
            </div>
          </Card>
        </Tab>

        {/* --- TAB 3: HORARIOS --- */}
        <Tab eventKey="hours" title={<span><Clock className="me-2" /> Horarios</span>}>
          <Card className="border-0 shadow-sm p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">Configura tu semana habitual</h5>
              <Button variant="primary" onClick={handleSaveSchedule} disabled={loading}>
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>

            {daysOfWeek.map((dayName, index) => (
              <Row key={index} className="align-items-center mb-3 py-2 border-bottom">
                <Col xs={4} md={3}>
                  <div className="fw-bold">{dayName}</div>
                </Col>

                <Col xs={8} md={3}>
                  <Form.Check
                    type="switch"
                    id={`switch-${index}`}
                    label={schedule[index]?.isOpen ? "Abierto" : "Cerrado"}
                    checked={schedule[index]?.isOpen}
                    onChange={(e) => handleScheduleChange(index, "isOpen", e.target.checked)}
                    className={schedule[index]?.isOpen ? "text-success fw-bold" : "text-muted"}
                  />
                </Col>

                {schedule[index]?.isOpen && (
                  <Col xs={12} md={6} className="d-flex gap-2 mt-2 mt-md-0">
                    {/* SELECTOR DE APERTURA */}
                    <Form.Select
                      value={schedule[index].start}
                      onChange={(e) => handleScheduleChange(index, "start", e.target.value)}
                    >
                      {TIME_SLOTS.map(time => (
                        <option key={`start-${time}`} value={time}>{time}</option>
                      ))}
                    </Form.Select>

                    <span className="align-self-center fw-bold">-</span>

                    {/* SELECTOR DE CIERRE */}
                    <Form.Select
                      value={schedule[index].end}
                      onChange={(e) => handleScheduleChange(index, "end", e.target.value)}
                    >
                      {TIME_SLOTS.map(time => (
                        <option key={`end-${time}`} value={time}>{time}</option>
                      ))}
                    </Form.Select>
                  </Col>
                )}
              </Row>
            ))}
          </Card>
        </Tab>

      </Tabs>
      {/* FIN DE TABS */}

      {/* --- MODAL GENÉRICO --- */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalType === "service" ? "Nuevo Servicio" : "Nuevo Profesional"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                required
                autoFocus
                value={formData.name || ""}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </Form.Group>

            {modalType === "service" && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Duración (minutos)</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    value={formData.duration || ""}
                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Precio ($)</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    value={formData.price || ""}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                  />
                </Form.Group>
              </>
            )}

            <Button type="submit" disabled={loading} className="w-100">
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

    </MainLayout>
  );
}
