import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { getCollection, createAppointment, createRecurringAppointments } from "../services/dbService";
import Swal from 'sweetalert2';
import { useSector } from "../hooks/useSector";
import { saveDocument } from "../services/dbService";


// Generador de horarios cada 30 minutos
const TIME_SLOTS = [];
for (let i = 0; i < 24; i++) {
  const hour = i.toString().padStart(2, '0');
  TIME_SLOTS.push(`${hour}:00`);
  TIME_SLOTS.push(`${hour}:30`);
}

const getFriendlyDate = (dateString) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};

export default function NewAppointmentModal({ show, handleClose, tenantId, tenant, onSaved, initialData }) {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);
  const [clients, setClients] = useState([]);

  // Estados del formulario
  const [clientName, setClientName] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedResource, setSelectedResource] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState("10:00");

  // SECTORES Y MÓDULOS
  const sector = useSector(tenant);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [deposit, setDeposit] = useState('');

  const [isRecurring, setIsRecurring] = useState(false);
  const [weeksToRepeat, setWeeksToRepeat] = useState(4);

  useEffect(() => {
    // Si el modal se muestra y hay datos iniciales (click en el calendario)
    if (show && initialData) {
      const startDate = initialData.start; // Objeto Date

      // 1. Extraer Fecha (YYYY-MM-DD)
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const newDateVal = `${year}-${month}-${day}`;

      // 2. Extraer Hora (HH:MM)
      const hours = String(startDate.getHours()).padStart(2, '0');
      const minutes = String(startDate.getMinutes()).padStart(2, '0');
      const newTimeVal = `${hours}:${minutes}`;

      // Actualizamos estado (Las validaciones if siguen siendo útiles por seguridad)
      if (date !== newDateVal) {
        setDate(newDateVal);
      }

      if (time !== newTimeVal) {
        setTime(newTimeVal);
      }

      if (initialData.resourceId && selectedResource !== initialData.resourceId) {
        setSelectedResource(initialData.resourceId);
      }

    } else if (show && !initialData) {
      // Si abren el modal con el botón "Nuevo" (Reseteo manual)
      const today = new Date().toISOString().split('T')[0];

      if (date !== today) setDate(today);
      if (time !== "10:00") setTime("10:00");
      if (selectedResource !== "") setSelectedResource("");
    }

    // --- CAMBIO CLAVE AQUÍ ABAJO ---
    // Quitamos 'date', 'time' y 'selectedResource' de aquí.
    // Solo escuchamos cambios en 'show' y 'initialData'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, initialData]);

  // Cargar las listas
  useEffect(() => {
    if (tenantId) {
      const loadData = async () => {
        try {
          const s = await getCollection("services", tenantId);
          const r = await getCollection("resources", tenantId);
          const c = await getCollection("clients", tenantId);
          setServices(s);
          setResources(r);
          setClients(c);
        } catch (error) {
          console.error("Error cargando datos:", error);
        }
      };
      loadData();
    }
  }, [tenantId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const serviceObj = services.find(s => s.id === selectedService);

      if (!serviceObj) {
        setLoading(false);
        return Swal.fire({
          icon: 'info',
          title: 'Falta información',
          text: 'Por favor selecciona un servicio para continuar.'
        });
      }

      // Buscar cliente existente
      const existingClient = clients.find(c => c.name && c.name.toLowerCase() === clientName.toLowerCase());

      // --- Calcular fecha inicio y fin ---
      const startDateTime = new Date(`${date}T${time}`);
      const endDateTime = new Date(startDateTime.getTime() + serviceObj.duration * 60000);

      // --- Asignar Recurso ---
      let finalResourceId = selectedResource;
      let finalResourceName = "General";

      if (!selectedResource && resources.length > 0) {
        finalResourceId = resources[0].id;
        finalResourceName = resources[0].name;
      } else if (selectedResource) {
        const r = resources.find(res => res.id === selectedResource);
        finalResourceId = selectedResource;
        finalResourceName = r ? r.name : "General";
      }

      // --- Calcular Precios ---
      const price = Number(serviceObj.price);
      const depositAmount = Number(deposit) || 0;

      let initialStatus = 'pending';
      let initialBg = '#e0f2fe';
      let initialBorder = '#0ea5e9';

      if (depositAmount >= price) {
        initialStatus = 'paid';
        initialBg = "#d1fae5";
        initialBorder = "#10b981";
      } else if (depositAmount > 0) {
        initialStatus = 'partial';
        initialBg = "#fef3c7";
        initialBorder = "#f59e0b";
      }

      // --- OBJETO MAESTRO DEL TURNO ---
      const newTurno = {
        tenantId,
        title: serviceObj.name,
        client: clientName,
        clientId: existingClient ? existingClient.id : null,
        clientPhone: existingClient ? existingClient.phone : null,
        resourceId: finalResourceId,
        resourceName: finalResourceName,
        serviceId: selectedService,
        price: price,
        deposit: depositAmount,
        balance: price - depositAmount,
        bgColor: initialBg,
        borderColor: initialBorder,
        start: startDateTime,
        end: endDateTime,
        vehiclePlate: vehiclePlate || null,
        vehicleModel: vehicleModel || null,
        textColor: "#0369a1",
        status: initialStatus,
      };

      // --- LÓGICA DE GUARDADO ---

      // 1. Guardar el turno principal
      const docRef = await createAppointment(newTurno);

      if (depositAmount > 0) {
        await saveDocument("movements", {
          tenantId,
          description: `Seña Turno: ${serviceObj.name} - ${clientName}`,
          amount: depositAmount,
          type: "income",
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date(),
          appointmentId: docRef.id
        });
      }

      // 2. Si es recurrente,
      if (isRecurring && sector.features?.recurring) {
        const { created } = await createRecurringAppointments(newTurno, weeksToRepeat);

        Swal.fire({
          icon: 'success',
          title: 'Turnos Fijos Creados',
          text: `Se creó el turno de hoy + ${created.length} repeticiones futuras.`
        });
      } else {

        Swal.fire({
          position: 'center',
          icon: 'success',
          title: 'Turno agendado',
          showConfirmButton: false,
          timer: 1500
        });
      }

      // --- LIMPIEZA Y CIERRE ---
      handleClose();
      if (onSaved) onSaved();


      setClientName('');
      setVehiclePlate('');
      setVehicleModel('');
      setDeposit('');
      setIsRecurring(false);

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Error al guardar el turno', 'error');
    }
    setLoading(false);
  };

  // Botones de fecha
  const setToday = () => setDate(new Date().toISOString().split('T')[0]);
  const setTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="fw-bold fs-5">
          {initialData ? "⚡ Agendar Turno Rápido" : "📅 Nuevo Turno"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Nombre del Cliente</Form.Label>
            <Form.Control
              type="text"
              placeholder="🔍 Escribe para buscar..."
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              required
              autoFocus
              list="client-options"
              autoComplete="off"
              className="form-control-lg"
            />
            <datalist id="client-options">
              {clients.map(c => (
                <option key={c.id} value={c.name}>
                  {c.phone ? `📱 ${c.phone}` : ''}
                </option>
              ))}
            </datalist>
            {clients.some(c => c.name && c.name.toLowerCase() === clientName.toLowerCase()) && (
              <Form.Text className="text-success fw-bold">
                ✓ Cliente registrado detectado
              </Form.Text>
            )}
          </Form.Group>

          {/* MÓDULO PAGOS PARCIALES */}
          {sector.features?.partialPayment && selectedService && (
            <Row className="mb-3 animate-fade-in">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Precio Total</Form.Label>
                  <Form.Control
                    value={`$${services.find(s => s.id === selectedService)?.price}`}
                    disabled
                    className="bg-light fw-bold text-dark"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Entrega / Seña ($)</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="0"
                    value={deposit}
                    onChange={e => setDeposit(e.target.value)}
                    max={services.find(s => s.id === selectedService)?.price}
                    className="border-primary"
                  />
                  {deposit > 0 && (
                    <Form.Text className="text-danger fw-bold small">
                      Restan: ${services.find(s => s.id === selectedService)?.price - deposit}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>
          )}

          {/* MÓDULO AUTOMOTRIZ */}
          {sector.features?.vehicleInfo && (
            <div className="p-3 bg-light rounded mb-3 border">
              <h6 className="text-muted mb-2 fw-bold" style={{ fontSize: '0.75rem' }}>DATOS DEL VEHÍCULO</h6>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Control
                      placeholder="Patente (Ej: AA123BB)"
                      value={vehiclePlate}
                      onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Control
                      placeholder="Modelo (Ej: Toyota)"
                      value={vehicleModel}
                      onChange={e => setVehicleModel(e.target.value)}
                      size="sm"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Servicio</Form.Label>
                <Form.Select
                  value={selectedService}
                  onChange={e => setSelectedService(e.target.value)}
                  required
                  className="form-select-lg"
                >
                  <option value="">Seleccionar...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration} min) - ${s.price}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">{sector.resourceLabel}</Form.Label>
                <Form.Select
                  value={selectedResource}
                  onChange={e => setSelectedResource(e.target.value)}
                >
                  <option value="">Cualquier {sector.resourceLabel} (Automático)</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Fecha del Turno</Form.Label>


                {!initialData && (
                  <div className="d-flex gap-2 mb-2">
                    <Button variant="outline-secondary" size="sm" onClick={setToday} className="w-50">
                      Hoy
                    </Button>
                    <Button variant="outline-secondary" size="sm" onClick={setTomorrow} className="w-50">
                      Mañana
                    </Button>
                  </div>
                )}

                <div className="input-group">
                  <Form.Control
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{ fontWeight: 'bold' }}
                  />
                </div>
                <div className="text-primary small mt-1 fw-bold text-capitalize">
                  📅 {getFriendlyDate(date)}
                </div>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Hora Inicio</Form.Label>
                <Form.Select
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  required
                  className="fw-bold"
                >
                  {/* Si la hora no está en la lista, la agregamos dinámicamente */}
                  {!TIME_SLOTS.includes(time) && (
                    <option value={time}>{time} hs</option>
                  )}
                  {TIME_SLOTS.map(t => (
                    <option key={t} value={t}>
                      {t} hs
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* MÓDULO TURNOS RECURRENTES */}
          {sector.features?.recurring && (
            <div className="bg-light p-3 rounded mb-3 border">
              <Form.Check
                type="switch"
                id="recurring-switch"
                label="🔄 Repetir este turno (Fijo)"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="fw-bold text-primary mb-2"
              />
              {isRecurring && (
                <div className="d-flex align-items-center gap-2 animate-fade-in">
                  <span>Repetir durante</span>
                  <Form.Select
                    style={{ width: 'auto' }}
                    value={weeksToRepeat}
                    onChange={(e) => setWeeksToRepeat(Number(e.target.value))}
                  >
                    <option value={4}>1 Mes (4 semanas)</option>
                    <option value={8}>2 Meses (8 semanas)</option>
                    <option value={12}>3 Meses (12 semanas)</option>
                  </Form.Select>
                  <small className="text-muted">mismo día y hora.</small>
                </div>
              )}
            </div>
          )}

          <div className="d-grid mt-4">
            <Button variant="primary" type="submit" disabled={loading} size="lg" className="shadow-sm">
              {loading ? "Guardando..." : "Confirmar Reserva"}
            </Button>
          </div>

        </Form>
      </Modal.Body>
    </Modal>
  );
}