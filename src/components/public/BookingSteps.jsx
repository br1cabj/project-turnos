import React from 'react';
import { Card, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Clock, CashCoin, ChevronRight, Person, CheckCircleFill, Whatsapp, CalendarDate, GeoAltFill } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import DateSelector from '../DateSelector';

// --- PASO 1: SELECCIÓN DE SERVICIO ---
export const StepServices = ({ services, onSelect }) => (
  <div className="animate-fade-in">
    <h5 className="mb-4 fw-bold text-center">1. Selecciona un servicio</h5>

    {services.length === 0 ? (
      <Alert variant="info" className="text-center bg-light border-0">
        No hay servicios configurados en este momento.
      </Alert>
    ) : (
      <div className="d-flex flex-column gap-3">
        {services.map(s => (
          <Card
            key={s.id}
            className="border-0 shadow-sm service-card"
            onClick={() => onSelect(s)}
            // ✅ AQUÍ ESTÁ EL PUNTERO
            style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
          >
            <Card.Body className="d-flex justify-content-between align-items-center p-3">
              <div>
                <h6 className="fw-bold mb-1 text-dark">{s.name}</h6>
                <div className="text-muted small d-flex align-items-center">
                  <Clock className="me-1" size={12} /> {s.duration} min
                  <span className="mx-2">•</span>
                  <CashCoin className="me-1" size={12} /> <span className="fw-bold text-success">${s.price}</span>
                </div>
              </div>
              <ChevronRight className="text-muted" />
            </Card.Body>
          </Card>
        ))}
      </div>
    )}

    {/* Estilos para el Hover */}
    <style>{`
      .service-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15) !important;
        border-left: 4px solid #0d6efd !important;
      }
    `}</style>
  </div>
);

// --- PASO 2: SELECCIÓN DE RECURSO ---
export const StepResources = ({ resources, onSelect, label }) => (
  <div className="animate-fade-in">
    <h5 className="mb-4 fw-bold text-center">2. Selecciona {label || 'Profesional'}</h5>

    <div className="d-flex flex-column gap-3">
      {/* Opción: Cualquiera */}
      <Card
        className="border-0 shadow-sm resource-card"
        onClick={() => onSelect(null)}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      >
        <Card.Body className="d-flex align-items-center p-3">
          <div className="bg-light rounded-circle p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
            <Person size={24} className="text-primary" />
          </div>
          <div>
            <h6 className="fw-bold mb-0 text-dark">Cualquier profesional</h6>
            <small className="text-muted">Mayor disponibilidad horaria</small>
          </div>
          <ChevronRight className="ms-auto text-muted" />
        </Card.Body>
      </Card>

      {/* Lista de Profesionales */}
      {resources.map(r => (
        <Card
          key={r.id}
          className="border-0 shadow-sm resource-card"
          onClick={() => onSelect(r)}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <Card.Body className="d-flex align-items-center p-3">
            <div className="me-3">
              {r.photoUrl ? (
                <img
                  src={r.photoUrl}
                  alt={r.name}
                  className="rounded-circle border"
                  style={{ width: 50, height: 50, objectFit: 'cover' }}
                />
              ) : (
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 50, height: 50, fontSize: '1.2rem' }}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h6 className="fw-bold mb-0 text-dark">{r.name}</h6>
              {r.description && <div className="text-muted small">{r.description}</div>}
            </div>
            <ChevronRight className="ms-auto text-muted" />
          </Card.Body>
        </Card>
      ))}
    </div>

    <style>{`
      .resource-card:hover {
        transform: scale(1.02);
        background-color: #f8f9fa;
        border: 1px solid #0d6efd !important;
      }
    `}</style>
  </div>
);

// --- PASO 3: FECHA Y HORA ---
export const StepDateTime = ({ selectedDate, onDateChange, slots, onTimeSelect, loading }) => (
  <div className="animate-fade-in">
    <h5 className="mb-4 fw-bold text-center">3. Fecha y Hora</h5>

    {/* Componente DateSelector importado */}
    <DateSelector selectedDate={selectedDate} onDateChange={onDateChange} />

    <hr className="text-muted opacity-25 my-4" />

    <h6 className="text-muted small fw-bold text-uppercase text-center mb-3">Horarios Disponibles</h6>

    {loading ? (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" size="sm" />
        <span className="ms-2 text-muted small">Buscando huecos...</span>
      </div>
    ) : (
      <>
        {selectedDate && slots.length > 0 ? (
          <Row className="g-2 justify-content-center">
            {slots.map((time) => (
              <Col xs={4} sm={3} key={time}>
                <Button
                  variant="outline-primary"
                  className="w-100 py-2 fw-bold time-slot"
                  onClick={() => onTimeSelect(time)}
                >
                  {time}
                </Button>
              </Col>
            ))}
          </Row>
        ) : (
          <div className="text-center py-4 bg-light rounded border border-dashed">
            <CalendarDate className="text-muted mb-2" size={24} />
            <p className="text-muted small mb-0">
              {selectedDate ? "No quedan turnos para esta fecha." : "Selecciona una fecha arriba."}
            </p>
          </div>
        )}
      </>
    )}

    <style>{`
      .time-slot:hover { transform: scale(1.05); background-color: #0d6efd; color: white; }
    `}</style>
  </div>
);

// --- PASO 4: FORMULARIO DE DATOS ---
export const StepForm = ({ bookingData, onChange, onSubmit, processing }) => (
  <div className="animate-fade-in">
    <h5 className="mb-4 fw-bold text-center">4. Tus Datos</h5>

    <Card className="border-0 shadow-sm mb-4 bg-light">
      <Card.Body className="p-3">
        <div className="d-flex align-items-center mb-2">
          <CheckCircleFill className="text-success me-2" />
          <span className="fw-bold text-dark">{bookingData.service?.name}</span>
        </div>
        <div className="text-muted small ms-4">
          📅 {bookingData.date} a las {bookingData.time}hs
          <br />
          👤 {bookingData.resource ? bookingData.resource.name : "Profesional asignado"}
        </div>
      </Card.Body>
    </Card>

    <Form onSubmit={onSubmit}>
      <Form.Group className="mb-3">
        <Form.Label className="small fw-bold text-muted text-uppercase">Nombre Completo</Form.Label>
        <Form.Control
          required
          placeholder="Ej: Juan Pérez"
          value={bookingData.clientName}
          // Usamos el prop 'onChange' pasado desde PublicBooking
          onChange={e => onChange('clientName', e.target.value)}
          className="form-control-lg fs-6"
        />
      </Form.Group>

      <Row>
        <Col xs={12} md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-muted text-uppercase">Teléfono (WhatsApp)</Form.Label>
            <Form.Control
              required
              type="tel"
              placeholder="Ej: 11 2233 4455"
              value={bookingData.clientPhone}
              onChange={e => onChange('clientPhone', e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold text-muted text-uppercase">Email (Opcional)</Form.Label>
            <Form.Control
              type="email"
              placeholder="contacto@email.com"
              value={bookingData.clientEmail}
              onChange={e => onChange('clientEmail', e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>

      <div className="d-grid gap-2 mt-4">
        <Button
          type="submit"
          size="lg"
          className="fw-bold shadow-sm"
          disabled={processing}
        >
          {processing ? <Spinner size="sm" animation="border" /> : "Confirmar Reserva"}
        </Button>
      </div>
    </Form>
  </div>
);

// --- PASO 5: ÉXITO ---
export const StepSuccess = ({ bookingData, tenantName, slug }) => {
  const msg = `Hola! Guardé mi turno en *${tenantName}*:\n📅 ${bookingData.date} a las ${bookingData.time}hs\n✂ ${bookingData.service?.name}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

  return (
    <div className="text-center animate-fade-in py-5">
      <div className="text-success mb-3"><CheckCircleFill size={80} /></div>
      <h2 className="fw-bold mb-3 text-dark">¡Reserva Confirmada!</h2>
      <p className="text-muted mb-4">Te esperamos en <strong>{tenantName}</strong>.</p>

      <Card className="border-0 bg-light mb-4 text-start mx-auto" style={{ maxWidth: '350px' }}>
        <Card.Body>
          <div className="d-flex align-items-center mb-2">
            <CalendarDate className="me-3 text-primary" />
            <strong>{bookingData.date}</strong>
          </div>
          <div className="d-flex align-items-center mb-2">
            <Clock className="me-3 text-primary" />
            <strong>{bookingData.time} hs</strong>
          </div>
          <div className="d-flex align-items-center">
            <GeoAltFill className="me-3 text-primary" />
            <strong>{tenantName}</strong>
          </div>
        </Card.Body>
      </Card>

      <div className="d-grid gap-2 col-md-8 mx-auto mb-4">
        <Button variant="success" size="lg" href={whatsappUrl} target="_blank" className="fw-bold shadow-sm">
          <Whatsapp className="me-2" /> Guardar en WhatsApp
        </Button>
      </div>

      <Button
        as={Link}
        to={`/reservar/${slug}`}
        onClick={() => window.location.reload()}
        variant="link"
        className="text-decoration-none text-muted"
      >
        Hacer otra reserva
      </Button>
    </div>
  );
};