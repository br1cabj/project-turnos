import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import { Card, Button, Form, Spinner } from 'react-bootstrap'
import { StarFill, Star } from 'react-bootstrap-icons'
import Swal from 'sweetalert2'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { createReview } from '../services/dbService'

export default function RateService() {
  const { apptId } = useParams()
  const navigate = useNavigate()

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadAppt() {
      try {
        const docRef = doc(db, "appointments", apptId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.rating) {
            setSubmitted(true);
          }
          setAppointment({ id: docSnap.id, ...data });
        } else {
          Swal.fire("Error", "Turno no encontrado", "error");
        }
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    }
    loadAppt();
  }, [apptId]);

  const handleSubmit = async () => {
    if (rating === 0) return Swal.fire('Faltan estrellas', 'Por favot toca las estrellas para calificar', 'warning')

    setLoading(true)
    try {
      await createReview({
        tenantId: appointment.tenantId,
        appointmentId: appointment.id,
        serviceName: appointment.title,
        professionalName: appointment.resourceName,
        clientName: appointment.client,
        rating,
        comment
      });

      const docRef = doc(db, 'appointments', apptId)
      await updateDoc(docRef, { rating: rating, reviewComment: comment })

      setSubmitted(true);
      Swal.fire('¡Gracias!', 'Tu opinion nos ayuda a mejorar', 'success')
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No pudimos guardar tu opinión', 'error')
    }
    setLoading(false)
  }

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (!appointment) return <div className="text-center mt-5">No existe este turno.</div>;

  if (submitted) {
    return (
      <PublicLayout>
        <Card className="text-center p-5 shadow-sm border-0">
          <div className="text-warning mb-3">
            {[...Array(5)].map((_, i) => (
              <StarFill key={i} size={30} className={i < (appointment.rating || rating) ? "text-warning" : "text-muted"} />
            ))}
          </div>
          <h3>¡Gracias por tu opinión!</h3>
          <p className="text-muted">Ya hemos registrado tu calificación para {appointment.resourceName}.</p>
        </Card>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="text-center mb-4">
        <h4 className="fw-bold">Califica tu experiencia</h4>
        <p className="text-muted">
          ¿Qué te pareció el servicio de <strong>{appointment.title}</strong> con <strong>{appointment.resourceName}</strong>?
        </p>
      </div>

      <Card className="shadow-sm border-0 p-4">
        <div className="d-flex justify-content-center mb-4 gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <div
              key={star}
              style={{ cursor: 'pointer' }}
              onClick={() => setRating(star)}
            >
              {star <= rating ? (
                <StarFill size={40} className="text-warning" />
              ) : (
                <Star size={40} className="text-muted" />
              )}
            </div>
          ))}
        </div>

        <Form.Group className="mb-4">
          <Form.Label>Comentario (Opcional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Excelente atención, muy puntual..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Form.Group>

        <Button variant="primary" size="lg" className="w-100" onClick={handleSubmit} disabled={loading}>
          {loading ? "Enviando..." : "Enviar Calificación"}
        </Button>
      </Card>
    </PublicLayout>
  );
}
