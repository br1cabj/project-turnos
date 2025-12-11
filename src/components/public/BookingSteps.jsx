import React from 'react';
import { Card, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { Clock, CashCoin, ChevronRight, Person, CheckCircleFill, Whatsapp } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import DateSelector from '../DateSelector';

export const StepServices = ({ services, onSelect }) => (
  <div className="animate-fade-in">
    <h5 className="mb-3 fw-bold text-secondary">1. Selecciona un servicio</h5>
    <div className="d-flex flex-column gap-3">
      {services.map(s => (
        <Card key={s.id} className="border-0 shadow-sm cursor-pointer hover-card" onClick={() => onSelect(s)}>
          <Card.Body className="d-flex justify-content-between align-items-center">
            <div>
              <h6 className="fw-bold mb-1">{s.name}</h6>
              <div className="text-muted small">
                <Clock className="me-1" /> {s.duration} min • <CashCoin className="me-1" /> ${s.price}
              </div>
            </div>
            <ChevronRight className="text-muted" />
          </Card.Body>
        </Card>
      ))}
    </div>
  </div>
);

export const StepResources = ({ resources, onSelect, label }) => (
  <div className="animate-fade-in">
    <h5 className="mb-3 fw-bold text-secondary">2. Selecciona {label}</h5>
    <div className="d-flex flex-column gap-3">
      <Card className="border-0 shadow-sm cursor-pointer hover-card" onClick={() => onSelect(null)}>
        <Card.Body className="d-flex align-items-center">
          <div className="bg-light rounded-circle p-2 me-3"><Person size={24} /></div>
          <h6 className="fw-bold mb-0">Cualquier profesional disponible</h6>
        </Card.Body>
      </Card>
      {resources.map(r => (
        <Card key={r.id} className="border-0 shadow-sm cursor-pointer hover-card" onClick={() => onSelect(r)}>
          <Card.Body className="d-flex align-items-center">
            <div className="me-3">
              {r.photoUrl ? (
                <img src={r.photoUrl} alt={r.name} className="rounded-circle" style={{ width: 50, height: 50, objectFit: 'cover' }} />
              ) : (
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 50, height: 50 }}>{r.name.charAt(0)}</div>
              )}
            </div>
            <div>
              <h6 className="fw-bold mb-0">{r.name}</h6>
              {r.description && <div className="text-muted small">{r.description}</div>}
            </div>
          </Card.Body>
        </Card>
      ))}
    </div>
  </div>
);

export const StepDateTime = ({ selectedDate, onDateChange, slots, onTimeSelect }) => (
  <div className="animate-fade-in">
    <h5 className="mb-3 fw-bold text-secondary">3. Fecha y Hora</h5>
    <DateSelector selectedDate={selectedDate} onDateChange={onDateChange} />
    {selectedDate && (
      <Row className="g-2 mt-3">
        {slots.map((time) => (
          <Col xs={4} sm={3} key={time}>
            <Button variant="outline-primary" className="w-100 py-2" onClick={() => onTimeSelect(time)}>{time}</Button>
          </Col>
        ))}
        {slots.length === 0 && <Alert variant="warning" className="w-100 text-center">Sin horarios disponibles.</Alert>}
      </Row>
    )}
  </div>
);

export const StepForm = ({ bookingData, onSubmit, processing }) => (
  <div className="animate-fade-in">
    <h5 className="mb-3 fw-bold text-secondary">4. Tus Datos</h5>
    <Card className="border-0 shadow-sm">
      <Card.Body>
        <Alert variant="light" className="border">
          <strong>Resumen:</strong> {bookingData.service?.name}<br />
          📅 {bookingData.date} a las {bookingData.time}hs<br />
          👤 {bookingData.resource ? bookingData.resource.name : "Profesional asignado"}
        </Alert>
        <Form onSubmit={onSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre Completo</Form.Label>
            <Form.Control required value={bookingData.clientName} onChange={e => bookingData.onChange('clientName', e.target.value)} placeholder="Ej: Juan Pérez" />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Teléfono / WhatsApp</Form.Label>
            <Form.Control required type="tel" value={bookingData.clientPhone} onChange={e => bookingData.onChange('clientPhone', e.target.value)} />
          </Form.Group>
          <Button type="submit" size="lg" className="w-100" disabled={processing}>
            {processing ? "Confirmando..." : "Confirmar Reserva"}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  </div>
);

export const StepSuccess = ({ bookingData, tenantName, slug }) => {
  const msg = `Hola! Te confirmo mi turno en *${tenantName}* para *${bookingData.service?.name}* el día ${bookingData.date} a las ${bookingData.time}hs.`;
  const whatsappUrl = `https://wa.me/${bookingData.clientPhone}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="text-center animate-fade-in py-5">
      <div className="text-success mb-3"><CheckCircleFill size={80} /></div>
      <h2 className="fw-bold mb-3">¡Reserva Confirmada!</h2>
      <p className="text-muted mb-4">Te esperamos el <strong>{bookingData.date}</strong> a las <strong>{bookingData.time}hs</strong>.</p>

      <div className="d-grid gap-2 col-md-8 mx-auto mb-4">
        <Button variant="success" size="lg" href={whatsappUrl} target="_blank">
          <Whatsapp className="me-2" /> Enviarme recordatorio
        </Button>
      </div>
      <Button as={Link} to={`/reservar/${slug}`} onClick={() => window.location.reload()} variant="outline-primary">Hacer otra reserva</Button>
    </div>
  );
};