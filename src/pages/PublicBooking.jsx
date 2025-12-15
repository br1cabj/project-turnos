import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import { Button, Spinner, Form, Card, ProgressBar, Container, Badge } from 'react-bootstrap';
import { ArrowLeft, StarFill, Star, CalendarCheck } from 'react-bootstrap-icons';
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

  // 2. Hook de UI (Etiquetas según sector)
  const sector = useSector(tenant);

  // 3. Estados Locales
  const [viewMode, setViewMode] = useState('booking'); // 'booking' | 'rating'
  const [reviewForm, setReviewForm] = useState({ rating: 0, name: '', comment: '' });
  const [hoverRating, setHoverRating] = useState(0); // Para efecto visual en estrellas

  // --- EFECTOS ---
  // Scroll al top cada vez que cambia el paso para mejor UX en móviles
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, viewMode]);

  // --- CALCULADOS ---
  const progress = useMemo(() => {
    if (viewMode !== 'booking') return 0;
    // Pasos: 1=25%, 2=50%, 3=75%, 4=90%, 5=100%
    if (step === 5) return 100;
    return (step / 4) * 100;
  }, [step, viewMode]);

  // --- HANDLERS ---
  const handleServiceSelect = (s) => {
    updateBooking('service', s);
    nextStep();
  };

  const handleResourceSelect = (r) => {
    updateBooking('resource', r);
    nextStep();
  };

  const handleDateChange = (d) => {
    updateBooking('date', d);
    // No hacemos nextStep aquí, el usuario debe elegir hora
  };

  const handleTimeSelect = (t) => {
    updateBooking('time', t);
    nextStep();
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (reviewForm.rating === 0) return Swal.fire('Falta nota', 'Por favor selecciona las estrellas', 'warning');

    const success = await submitReview({
      author: reviewForm.name || 'Anónimo',
      rating: reviewForm.rating,
      comment: reviewForm.comment
    });

    if (success) {
      setReviewForm({ rating: 0, name: '', comment: '' });
      setViewMode('booking');
      Swal.fire({
        icon: 'success',
        title: '¡Gracias!',
        text: 'Tu opinión es muy importante para nosotros.',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // --- RENDERIZADO DE ESTADOS DE CARGA ---
  if (loading) return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light">
      <Spinner animation="grow" variant="primary" style={{ width: '3rem', height: '3rem' }} />
      <p className="mt-3 text-muted fw-bold">Cargando disponibilidad...</p>
    </div>
  );

  if (error) return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light">
      <div className="text-danger mb-3" style={{ fontSize: '3rem' }}>😕</div>
      <h3 className="text-dark fw-bold">No pudimos cargar el negocio</h3>
      <p className="text-muted">{error}</p>
      <Button variant="outline-primary" href="/">Volver al inicio</Button>
    </div>
  );

  return (
    <PublicLayout>
      <Container className="py-4" style={{ maxWidth: '600px' }}>

        {/* HEADER DEL NEGOCIO */}
        <div className="text-center mb-4 animate__animated animate__fadeInDown">
          <div className="position-relative d-inline-block mb-3">
            {tenant?.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt="Logo"
                className="rounded-circle shadow"
                style={{ width: 100, height: 100, objectFit: 'cover', border: '4px solid white' }}
              />
            ) : (
              <div className="rounded-circle shadow bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-1" style={{ width: 100, height: 100, border: '4px solid white' }}>
                {tenant?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h2 className="fw-bold text-dark mb-1">{tenant?.name}</h2>
          <p className="text-muted small mb-4">Reserva tu cita en pocos pasos</p>

          <div className="d-flex justify-content-center gap-2 bg-white p-1 rounded-pill shadow-sm d-inline-flex border">
            <Button
              variant={viewMode === 'booking' ? 'primary' : 'light'}
              onClick={() => setViewMode('booking')}
              className="rounded-pill px-4 fw-bold transition-all"
              size="sm"
            >
              <CalendarCheck className="me-2" /> Reservar
            </Button>
            <Button
              variant={viewMode === 'rating' ? 'warning' : 'light'}
              onClick={() => setViewMode('rating')}
              className={`rounded-pill px-4 fw-bold transition-all ${viewMode === 'rating' ? 'text-white' : 'text-muted'}`}
              size="sm"
            >
              <StarFill className="me-2" /> Calificar
            </Button>
          </div>
        </div>

        {/* --- VISTA: RESERVA --- */}
        {viewMode === 'booking' && (
          <div className="animate__animated animate__fadeInUp">

            {/* Barra de Progreso */}
            {step < 5 && (
              <div className="mb-4">
                <div className="d-flex justify-content-between text-muted small mb-1 fw-bold">
                  <span>Paso {step} de 4</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <ProgressBar now={progress} variant="primary" style={{ height: '6px', borderRadius: '10px' }} />
              </div>
            )}

            {/* Contenedor de Pasos */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <Card.Body className="p-0">

                {/* Botón Volver (Solo pasos intermedios) */}
                {step > 1 && step < 5 && (
                  <div className="p-3 border-bottom bg-light">
                    <Button
                      variant="link"
                      className="text-decoration-none text-muted p-0 d-flex align-items-center fw-bold"
                      onClick={prevStep}
                      style={{ fontSize: '0.9rem' }}
                    >
                      <ArrowLeft className="me-1" /> Volver atrás
                    </Button>
                  </div>
                )}

                {/* Renderizado de Pasos */}
                <div className="p-3 p-md-4">
                  {step === 1 && (
                    <StepServices
                      services={services}
                      onSelect={handleServiceSelect}
                      tenant={tenant}
                    />
                  )}

                  {step === 2 && (
                    <StepResources
                      resources={resources}
                      onSelect={handleResourceSelect}
                      label={sector.resourceLabel || "Profesional"}
                    />
                  )}

                  {step === 3 && (
                    <StepDateTime
                      selectedDate={bookingData.date}
                      onDateChange={handleDateChange}
                      slots={availableSlots}
                      onTimeSelect={handleTimeSelect}
                      loading={processing} // Usamos processing si estamos cargando slots
                    />
                  )}

                  {step === 4 && (
                    <StepForm
                      bookingData={bookingData}
                      // Pasamos función update para los campos del formulario
                      onChange={(field, val) => updateBooking(field, val)}
                      onSubmit={confirmBooking}
                      processing={processing}
                    />
                  )}

                  {step === 5 && (
                    <StepSuccess
                      bookingData={bookingData}
                      tenantName={tenant.name}
                      slug={slug}
                    />
                  )}
                </div>
              </Card.Body>
            </Card>
          </div>
        )}

        {/* --- VISTA: CALIFICAR --- */}
        {viewMode === 'rating' && (
          <div className="animate__animated animate__fadeInUp">
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-5 text-center">
                <div className="mb-4">
                  <span style={{ fontSize: '3rem' }}>⭐</span>
                </div>
                <h4 className="fw-bold mb-2">Tu opinión nos ayuda a mejorar</h4>
                <p className="text-muted mb-4">¿Cómo calificarías tu experiencia con {tenant?.name}?</p>

                <Form onSubmit={handleReviewSubmit}>
                  {/* Estrellas Interactivas */}
                  <div className="mb-4 d-flex justify-content-center gap-2" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        onMouseEnter={() => setHoverRating(star)}
                        style={{
                          fontSize: '2.5rem',
                          cursor: 'pointer',
                          transition: 'transform 0.1s',
                          color: (hoverRating || reviewForm.rating) >= star ? '#FFD700' : '#e9ecef',
                          transform: hoverRating === star ? 'scale(1.2)' : 'scale(1)'
                        }}
                      >
                        <StarFill />
                      </span>
                    ))}
                  </div>

                  <div className="text-start">
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold small text-muted">Tu Nombre (Opcional)</Form.Label>
                      <Form.Control
                        placeholder="Ej: María"
                        value={reviewForm.name}
                        onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })}
                        className="bg-light border-0 py-2"
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="fw-bold small text-muted">Comentario (Opcional)</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Cuéntanos más..."
                        value={reviewForm.comment}
                        onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        className="bg-light border-0 py-2"
                      />
                    </Form.Group>
                  </div>

                  <Button
                    type="submit"
                    variant="warning"
                    className="w-100 text-white fw-bold py-2 shadow-sm"
                    disabled={processing || reviewForm.rating === 0}
                  >
                    {processing ? <Spinner size="sm" /> : 'Enviar Calificación'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </div>
        )}

      </Container>

      {/* Estilos CSS Inline */}
      <style>{`
        .transition-all { transition: all 0.3s ease; }
        .animate__animated { animation-duration: 0.5s; }
      `}</style>
    </PublicLayout>
  );
}