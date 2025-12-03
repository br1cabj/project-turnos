import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import { Card, Button, Spinner, Form, Row, Col, Alert } from 'react-bootstrap';
import { Clock, CashCoin, ChevronRight, Person, CalendarDate, ArrowLeft, CheckCircleFill } from 'react-bootstrap-icons';
import { getCollection, getTenantBySlug, getAppointmentsByDate, createAppointment } from '../services/dbService';
import DateSelector from '../components/DateSelector';
import Swal from 'sweetalert2'
import { useSector } from '../hooks/useSector';
import { sendNewBookingAlert } from '../services/emailService';



export default function PublicBooking() {
  const { slug } = useParams()

  //DATOS NEGOCIO
  const [tenant, setTenant] = useState(null);
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);

  //Estados de carga
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false)

  //Estado Reserva
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);

  //Datos del cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const sector = useSector(tenant)


  useEffect(() => {
    async function loadData() {
      try {
        const business = await getTenantBySlug(slug);
        if (!business) {
          setError('Negocio no encontrado')
          setLoading(false)
          return
        }
        setTenant(business);

        //Servicios y Recursos
        const s = await getCollection("services", business.id);
        const r = await getCollection("resources", business.id);
        setServices(s);
        setResources(r);

      } catch (error) {
        console.error(error)
        Swal.fire('Lo sentimos', 'No pudimos cargar la información del negocio.', 'error');
      }
      setLoading(false)
    }
    loadData()
  }, [slug])

  useEffect(() => {
    const calculateAvailability = async () => {
      setAvailableSlots([]);
      if (!selectedDate) return;

      // --- LÓGICA DE DISPONIBILIDAD ---
      const dateObj = new Date(selectedDate + 'T00:00:00')
      const daysOfWeek = dateObj.getDay()

      const dayConfig = tenant.openingHours ? tenant.openingHours[daysOfWeek] : { isOpen: true, start: "09:00", end: "19:00" };

      if (!dayConfig || !dayConfig.isOpen) {
        return
      }

      // Traer los turnos 
      const existingAppointments = await getAppointmentsByDate(tenant.id, selectedDate);

      const duration = selectedService.duration;

      let slots = [];
      let currentTime = new Date(`${selectedDate}T09:00:00`);
      const endTime = new Date(`${selectedDate}T19:00:00`);

      // Bucle para generar huecos
      while (currentTime < endTime) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime.getTime() + duration * 60000);

        if (slotEnd > endTime) break;

        // VERIFICAR COLISIÓN
        const isBusy = existingAppointments.some(appt => {

          if (selectedResource && appt.resourceId !== selectedResource.id) return false;
          return (slotStart < appt.end && slotEnd > appt.start);
        });

        if (!isBusy) {
          const hours = slotStart.getHours().toString().padStart(2, '0');
          const minutes = slotStart.getMinutes().toString().padStart(2, '0');
          slots.push(`${hours}:${minutes}`);
        }

        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }

      setAvailableSlots(slots);
    };
    if (step === 3 && selectedDate && selectedService) {
      calculateAvailability();
    }
  }, [selectedDate, selectedResource, step, selectedService, tenant]);



  //Handlers
  const handleSelectService = (service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleSelectResource = (resource) => {
    setSelectedResource(resource)
    setStep(3)
  }

  const handleSelectTime = (time) => {
    setSelectedTime(time)
    setStep(4)
  }

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Preparar fechas
      const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const endDateTime = new Date(startDateTime.getTime() + selectedService.duration * 60000);

      // Resolver Recurso
      let finalResourceId = selectedResource ? selectedResource.id : resources[0].id;
      let finalResourceName = selectedResource ? selectedResource.name : resources[0].name;

      // 3. Objeto del turno
      const newAppointment = {
        tenantId: tenant.id,
        title: selectedService.name,
        client: customerName,
        clientPhone: customerPhone,
        resourceId: finalResourceId,
        resourceName: finalResourceName,
        serviceId: selectedService.id,
        price: selectedService.price,
        start: startDateTime,
        end: endDateTime,
        status: 'pending',
        createdAt: new Date(),
        // Estilos visuales
        bgColor: "#dbeafe",
        textColor: "#1e40af",
        borderColor: "#3b82f6"
      };

      // Guardar 
      await createAppointment(newAppointment);

      sendNewBookingAlert({
        ...newAppointment,
        tenantName: tenant.name
      }, tenant.ownerEmail);
      setStep(5);

    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Hubo un problema',
        text: 'No pudimos procesar tu reserva. Por favor intenta nuevamente'
      });
    }
    setSubmitting(false);
  };

  const goBack = () => {
    setStep(step - 1)
  }

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" variant="primary" /></div>;
  if (error) return <div className="text-center mt-5 text-danger"><h3>{error}</h3></div>;

  return (
    <PublicLayout>
      <div className="text-center mb-4">
        {tenant.logoUrl && (
          <img
            src={tenant.logoUrl}
            alt="Logo"
            className="mb-3 rounded-circle shadow-sm"
            style={{ width: 100, height: 100, objectFit: 'cover' }}
          />
        )}
        <h2 className="fw-bold">{tenant.name}</h2>
        {step > 1 && step < 5 && (
          <Button variant="link" className="text-decoration-none text-muted p-0 mb-2" onClick={goBack}>
            <ArrowLeft /> Volver
          </Button>
        )}
      </div>

      {/* PASO 1: SERVICIO */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h5 className="mb-3 fw-bold text-secondary">1. Selecciona un servicio</h5>
          <div className="d-flex flex-column gap-3">
            {services.map(service => (
              <Card key={service.id} className="border-0 shadow-sm service-card" onClick={() => handleSelectService(service)}>
                <Card.Body className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="fw-bold mb-1">{service.name}</h6>
                    <div className="text-muted small">
                      <Clock className="me-1" /> {service.duration} min • <CashCoin className="me-1" /> ${service.price}
                    </div>
                  </div>
                  <ChevronRight className="text-muted" />
                </Card.Body>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PASO 2: SECTOR */}
      {step === 2 && (
        <div className="animate-fade-in">
          <h5 className="mb-3 fw-bold text-secondary">2. Selecciona {sector.resourceLabel}</h5>
          <div className="d-flex flex-column gap-3">
            <Card className="border-0 shadow-sm service-card" onClick={() => handleSelectResource(null)}>
              <Card.Body className="d-flex align-items-center">
                <div className="bg-light rounded-circle p-2 me-3"><Person size={24} /></div>
                <h6 className="fw-bold mb-0">Con el primero disponible</h6>
              </Card.Body>
            </Card>
            {resources.map(resource => (
              <Card key={resource.id} className="border-0 shadow-sm service-card" onClick={() => handleSelectResource(resource)}>
                <Card.Body className="d-flex align-items-center">
                  <div className="bg-primary text-white rounded-circle p-2 me-3" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {resource.name.charAt(0)}
                  </div>
                  <h6 className="fw-bold mb-0">{resource.name}</h6>
                </Card.Body>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PASO 3: FECHA Y HORA */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h5 className="mb-3 fw-bold text-secondary">3. Fecha y Hora</h5>
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={(date) => setSelectedDate(date)}
          />

          {selectedDate && (
            <Row className="g-2">
              {availableSlots.map((time, index) => (
                <Col xs={4} sm={3} key={index}>
                  <Button variant="outline-primary" className="w-100 py-2" onClick={() => handleSelectTime(time)}>
                    {time}
                  </Button>
                </Col>
              ))}
              {availableSlots.length === 0 && <Alert variant="warning" className="text-center w-100">Sin horarios disponibles.</Alert>}
            </Row>
          )}
        </div>
      )}

      {/* PASO 4: DATOS DEL CLIENTE */}
      {step === 4 && (
        <div className="animate-fade-in">
          <h5 className="mb-3 fw-bold text-secondary">4. Tus Datos</h5>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="alert alert-light border mb-4">
                <strong>Resumen:</strong> {selectedService.name} <br />
                📅 {selectedDate} a las {selectedTime} <br />
                👤 {selectedResource ? selectedResource.name : "Profesional Asignado"}
              </div>

              <Form onSubmit={handleConfirmBooking}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre Completo</Form.Label>
                  <Form.Control
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Teléfono / WhatsApp</Form.Label>
                  <Form.Control
                    required
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder=''
                  />
                </Form.Group>
                <Button type="submit" variant="primary" size="lg" className="w-100" disabled={submitting}>
                  {submitting ? "Confirmando..." : "Confirmar Reserva"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* PASO 5: ÉXITO + WHATSAPP */}
      {step === 5 && (
        <div className="text-center animate-fade-in py-5">
          <div className="text-success mb-3">
            <CheckCircleFill size={80} />
          </div>
          <h2 className="fw-bold mb-3">¡Reserva Confirmada!</h2>
          <p className="text-muted mb-4">
            Te esperamos el <strong>{selectedDate}</strong> a las <strong>{selectedTime}hs</strong>.
          </p>

          {/* --- BOTÓN WHATSAPP --- */}
          <div className="d-grid gap-2 col-md-8 mx-auto mb-4">
            <Button
              variant="success"
              size="lg"
              onClick={() => {
                // Creamos el mensaje
                const msg = `Hola! Te confirmo mi turno en *${tenant.name}* para el servicio *${selectedService.name}* el día ${selectedDate} a las ${selectedTime}hs. Guardame!`;
                // Abrimos WhatsApp con el mensaje pre-cargado
                const url = `https://wa.me/${customerPhone}?text=${encodeURIComponent(msg)}`;
                window.open(url, '_blank');
              }}
            >
              <Whatsapp className="me-2" /> Enviarme recordatorio
            </Button>
          </div>
          {/* ----------------------- */}

          <Button as={Link} to={`/reservar/${slug}`} onClick={() => window.location.reload()} variant="outline-primary">
            Hacer otra reserva
          </Button>
        </div>
      )}

    </PublicLayout>
  );
}