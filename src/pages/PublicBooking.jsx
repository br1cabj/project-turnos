import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import { Button, Spinner, Form, Card } from 'react-bootstrap';
import { ArrowLeft } from 'react-bootstrap-icons';
import Swal from 'sweetalert2';

import { usePublicBooking } from '../hooks/usePublicBooking';
import { useSector } from '../hooks/useSector';
import { StepServices, StepResources, StepDateTime, StepForm, StepSuccess } from '../components/public/BookingSteps';

export default function PublicBooking() {
  const { slug } = useParams();

  // 1. Hook de Lógica
  const {
    tenant, services, resources, loading, error, processing,
    step, bookingData, availableSlots,
    updateBooking, nextStep, prevStep, confirmBooking, submitReview, setStep
  } = usePublicBooking(slug);

  // 2. Hook de UI (Etiquetas)
  const sector = useSector(tenant);

  // 3. Estado local simple para vista
  const [viewMode, setViewMode] = useState('booking');
  const [reviewForm, setReviewForm] = useState({ rating: 0, name: '', comment: '' });

  // --- Handlers de UI ---
  const handleServiceSelect = (s) => { updateBooking('service', s); nextStep(); };
  const handleResourceSelect = (r) => { updateBooking('resource', r); nextStep(); };
  const handleDateChange = (d) => { updateBooking('date', d); }; // No nextStep, espera hora
  const handleTimeSelect = (t) => { updateBooking('time', t); nextStep(); };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (reviewForm.rating === 0) return Swal.fire('Falta nota', 'Selecciona estrellas', 'warning');

    const success = await submitReview({ author: reviewForm.name, rating: reviewForm.rating, comment: reviewForm.comment });
    if (success) {
      setReviewForm({ rating: 0, name: '', comment: '' });
      setViewMode('booking');
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" variant="primary" /></div>;
  if (error) return <div className="text-center mt-5 text-danger"><h3>{error}</h3></div>;

  return (
    <PublicLayout>
      {/* HEADER DEL NEGOCIO */}
      <div className="text-center mb-4">
        {tenant?.logoUrl && (
          <img src={tenant.logoUrl} alt="Logo" className="mb-3 rounded-circle shadow-sm" style={{ width: 100, height: 100, objectFit: 'cover' }} />
        )}
        <h2 className="fw-bold">{tenant?.name}</h2>

        <div className="d-flex justify-content-center gap-2 mt-3 mb-4">
          <Button variant={viewMode === 'booking' ? 'primary' : 'outline-primary'} onClick={() => setViewMode('booking')} className="rounded-pill px-4">📅 Reservar</Button>
          <Button variant={viewMode === 'rating' ? 'warning' : 'outline-warning'} onClick={() => setViewMode('rating')} className="rounded-pill px-4">★ Calificar</Button>
        </div>
      </div>

      {/* MODO RESERVA */}
      {viewMode === 'booking' && (
        <>
          {step > 1 && step < 5 && (
            <div className="text-center mb-3">
              <Button variant="link" className="text-decoration-none text-muted p-0" onClick={prevStep}><ArrowLeft /> Volver</Button>
            </div>
          )}

          {step === 1 && <StepServices services={services} onSelect={handleServiceSelect} />}

          {step === 2 && <StepResources resources={resources} onSelect={handleResourceSelect} label={sector.resourceLabel} />}

          {step === 3 && (
            <StepDateTime
              selectedDate={bookingData.date}
              onDateChange={handleDateChange}
              slots={availableSlots}
              onTimeSelect={handleTimeSelect}
            />
          )}

          {step === 4 && (
            <StepForm
              bookingData={{ ...bookingData, onChange: updateBooking }}
              onSubmit={confirmBooking}
              processing={processing}
            />
          )}

          {step === 5 && <StepSuccess bookingData={bookingData} tenantName={tenant.name} slug={slug} />}
        </>
      )}

      {/* MODO REVIEW */}
      {viewMode === 'rating' && (
        <div className="animate-fade-in">
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4 text-center">
              <h4 className="fw-bold mb-3">Tu opinión nos ayuda</h4>
              <Form onSubmit={handleReviewSubmit}>
                <div className="mb-4 d-flex justify-content-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} onClick={() => setReviewForm({ ...reviewForm, rating: star })} style={{ fontSize: '2.5rem', cursor: 'pointer', color: star <= reviewForm.rating ? '#FFD700' : '#e4e5e9' }}>★</span>
                  ))}
                </div>
                <Form.Control className="mb-3" required placeholder="Tu Nombre" value={reviewForm.name} onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })} />
                <Form.Control className="mb-4" as="textarea" rows={3} placeholder="Comentario..." value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} />
                <Button type="submit" variant="warning" className="w-100 text-white fw-bold" disabled={processing}>{processing ? 'Enviando...' : 'Enviar Calificación'}</Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
      )}
    </PublicLayout>
  );
}