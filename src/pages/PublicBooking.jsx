import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import { Card, Button, Spinner, Form, Row, Col, Alert } from 'react-bootstrap';
import { Clock, CashCoin, ChevronRight, Person, CalendarDate, ArrowLeft, CheckCircleFill, Whatsapp } from 'react-bootstrap-icons';
import { getCollection, getTenantBySlug, getAppointmentsByDate, createAppointment, createReview } from '../services/dbService';
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

  //RAting
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const [viewMode, setViewMode] = useState('booking')

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewName, setReviewName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

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

      // 1. Obtener configuración del día 
      const dateObj = new Date(selectedDate + 'T00:00:00');
      const dayIndex = dateObj.getDay();

      const dayConfig = tenant.openingHours ? tenant.openingHours[dayIndex] : null;

      // Si está cerrado o no existe config, salimos
      if (!dayConfig || !dayConfig.isOpen) {
        return;
      }

      // 2. Traer los turnos existentes de la DB
      const existingAppointments = await getAppointmentsByDate(tenant.id, selectedDate);
      const duration = selectedService.duration;

      let slots = [];

      // 3. Configurar hora de inicio y fin
      const [startHour, startMin] = dayConfig.start.split(':');
      const [endHour, endMin] = dayConfig.end.split(':');

      let currentTime = new Date(dateObj);
      currentTime.setHours(parseInt(startHour), parseInt(startMin), 0);

      const endTime = new Date(dateObj);
      endTime.setHours(parseInt(endHour), parseInt(endMin), 0);

      // 4. Bucle para generar huecos
      while (currentTime < endTime) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime.getTime() + duration * 60000);


        if (slotEnd > endTime) break;

        // --- LÓGICA DE COLISIÓN  ---
        let isBusy = false;

        if (selectedResource) {
          // CASO A: El usuario eligió un profesional específico
          isBusy = existingAppointments.some(appt =>
            appt.resourceId === selectedResource.id &&
            (slotStart < appt.end && slotEnd > appt.start)
          );
        } else {
          // CASO B: "Cualquier profesional" (El primero disponible)

          // Filtramos cuántos turnos hay en este horario exacto (superpuestos)
          const overlappingAppts = existingAppointments.filter(appt =>
            (slotStart < appt.end && slotEnd > appt.start)
          );

          // Si hay tantos turnos superpuestos como recursos totales, entonces NO hay lugar
          if (overlappingAppts.length >= resources.length) {
            isBusy = true;
          }
        }

        if (!isBusy) {
          const hours = slotStart.getHours().toString().padStart(2, '0');
          const minutes = slotStart.getMinutes().toString().padStart(2, '0');
          slots.push(`${hours}:${minutes}`);
        }

        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }

      setAvailableSlots(slots);
    };

    if (step === 3 && selectedDate && selectedService && tenant) {
      calculateAvailability();
    }
  }, [selectedDate, selectedResource, step, selectedService, tenant, resources]);



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
        clientRating: null,
        clientComment: '',
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (reviewRating === 0) {
      Swal.fire('Falta la nota', 'Por favor selecciona las estrellas', 'warning')
      return;
    }

    setReviewSubmitting(true);

    try {
      const newReview = {
        tenantId: tenant.id,
        author: reviewName || 'Anónimo',
        rating: reviewRating,
        comment: reviewComment,
        createdAt: new Date(),
        approved: true
      }

      await createReview(newReview);

      Swal.fire({
        icon: 'success',
        title: '¡Gracias!',
        text: 'Tu calificación ha sido enviada.',
        confirmButtonColor: '#FFD700'
      });

      // Limpiamos el formulario
      setReviewRating(0);
      setReviewName('');
      setReviewComment('');

      setViewMode('booking')
    } catch (error) {
      console.error(error)
      Swal.fire(
        'Error', 'Hubo un problema al guardar tu reseña', 'error'
      )
    }
    setReviewSubmitting(false)

  }



  if (loading) return <div className="text-center mt-5"><Spinner animation="border" variant="primary" /></div>;
  if (error) return <div className="text-center mt-5 text-danger"><h3>{error}</h3></div>;

  return (
    <PublicLayout>
      <div className="text-center mb-4">
        {/* LOGO Y NOMBRE  */}
        {tenant && tenant.logoUrl && (
          <img
            src={tenant.logoUrl}
            alt="Logo"
            className="mb-3 rounded-circle shadow-sm"
            style={{ width: 100, height: 100, objectFit: 'cover' }}
          />
        )}
        <h2 className="fw-bold">{tenant ? tenant.name : 'Cargando...'}</h2>

        {/* BOTONES DE NAVEGACIÓN */}
        <div className="d-flex justify-content-center gap-2 mt-3 mb-4">
          <Button
            variant={viewMode === 'booking' ? 'primary' : 'outline-primary'}
            onClick={() => setViewMode('booking')}
            className="rounded-pill px-4"
          >
            📅 Reservar Turno
          </Button>
          <Button
            variant={viewMode === 'rating' ? 'warning' : 'outline-warning'}
            onClick={() => setViewMode('rating')}
            className="rounded-pill px-4"
          >
            ★ Calificar
          </Button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: RESERVA               */}
      {/* ========================================================= */}
      {viewMode === 'booking' && (
        <>
          {step > 1 && step < 5 && (
            <div className="text-center mb-3">
              <Button variant="link" className="text-decoration-none text-muted p-0" onClick={goBack}>
                <ArrowLeft /> Volver
              </Button>
            </div>
          )}

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

          {/* PASO 2: RESOURCE */}
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
                      <div className="me-3">
                        {resource.photoUrl ? (
                          <img src={resource.photoUrl} alt={resource.name} className="rounded-circle shadow-sm" style={{ width: 50, height: 50, objectFit: 'cover' }} />
                        ) : (
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 50, height: 50, fontSize: '1.2rem' }}>
                            {resource.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0">{resource.name}</h6>
                        {resource.description && <div className="text-muted small mt-1">{resource.description}</div>}
                      </div>
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

          {/* PASO 5: ÉXITO */}
          {step === 5 && (
            <div className="text-center animate-fade-in py-5">
              <div className="text-success mb-3">
                <CheckCircleFill size={80} />
              </div>
              <h2 className="fw-bold mb-3">¡Reserva Confirmada!</h2>
              <p className="text-muted mb-4">
                Te esperamos el <strong>{selectedDate}</strong> a las <strong>{selectedTime}hs</strong>.
              </p>
              <div className="d-grid gap-2 col-md-8 mx-auto mb-4">
                <Button
                  variant="success"
                  size="lg"
                  onClick={() => {
                    const msg = `Hola! Te confirmo mi turno en *${tenant.name}* para el servicio *${selectedService.name}* el día ${selectedDate} a las ${selectedTime}hs. Guardame!`;
                    const url = `https://wa.me/${customerPhone}?text=${encodeURIComponent(msg)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Whatsapp className="me-2" /> Enviarme recordatorio
                </Button>
              </div>
              <Button as={Link} to={`/reservar/${slug}`} onClick={() => window.location.reload()} variant="outline-primary">
                Hacer otra reserva
              </Button>
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: CALIFICACIÓN                */}
      {/* ========================================================= */}
      {viewMode === 'rating' && (
        <div className="animate-fade-in">
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4 text-center">
              <h4 className="fw-bold mb-3">Tu opinión nos ayuda a crecer</h4>
              <p className="text-muted">¿Cómo fue tu experiencia hoy?</p>

              <Form onSubmit={handleSubmitReview}>
                <div className="mb-4 d-flex justify-content-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setReviewRating(star)}
                      style={{
                        fontSize: '2.5rem',
                        cursor: 'pointer',
                        color: star <= reviewRating ? '#FFD700' : '#e4e5e9',
                        transition: 'color 0.2s'
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>

                <Form.Group className="mb-3 text-start">
                  <Form.Label>Tu Nombre</Form.Label>
                  <Form.Control
                    required
                    placeholder="Ej: Maria"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-4 text-start">
                  <Form.Label>Comentario (Opcional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Me encantó el servicio porque..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="warning"
                  size="lg"
                  className="w-100 text-white fw-bold"
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? 'Enviando...' : 'Enviar Calificación'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
      )}

    </PublicLayout>
  );
}