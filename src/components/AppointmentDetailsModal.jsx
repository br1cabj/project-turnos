import React, { useState } from "react";
import { Modal, Button, Badge, Row, Col, Alert, Spinner } from "react-bootstrap";
import { CashCoin, Trash, CalendarEvent, Clock, Person, CarFront } from "react-bootstrap-icons";
import { saveDocument, updateDocument, deleteDocument } from "../services/dbService";
import Swal from "sweetalert2";
import { useSector } from "../hooks/useSector";

// Helper para fecha local (YYYY-MM-DD)
const getLocalDateString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

export default function AppointmentDetailsModal({ show, handleClose, appointment, onUpdate, tenant }) {
  const [loading, setLoading] = useState(false);
  const sector = useSector(tenant);

  if (!appointment) return null;

  // Calculamos montos de forma segura
  const price = Number(appointment.price || 0);
  const deposit = Number(appointment.deposit || 0);
  const pendingAmount = Math.max(0, price - deposit);
  const isPaid = appointment.status === "paid" || pendingAmount === 0;

  // --- HANDLER: COBRAR ---
  const handleCheckOut = async () => {
    if (isPaid) return;

    const result = await Swal.fire({
      title: `Confirmar Cobro`,
      html: `
        <div style="text-align: left; font-size: 0.95rem;">
          <p style="margin-bottom: 5px;">Total Servicio: <b>$${price}</b></p>
          <p style="margin-bottom: 5px;">A cuenta: <b>-$${deposit}</b></p>
          <hr style="margin: 10px 0;">
          <p style="font-size: 1.2rem; color: #198754; font-weight: bold; text-align: center;">
            A COBRAR: $${pendingAmount}
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      confirmButtonText: '✅ Confirmar Pago',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      // 1. Registrar movimiento en Caja (Ingreso)
      await saveDocument("movements", {
        tenantId: appointment.tenantId,
        description: `Cobro turno: ${appointment.title} - ${appointment.client}`,
        amount: pendingAmount,
        type: "income",
        date: getLocalDateString(),
        createdAt: new Date(),
        appointmentId: appointment.id,
        createdBy: "Sistema" // O el usuario actual si lo tuviéramos en props
      });

      // 2. Actualizar el Turno
      await updateDocument("appointments", appointment.id, {
        status: "paid",
        deposit: price,
        balance: 0,
        bgColor: "#d1fae5",
        textColor: "#065f46",
        borderColor: "#10b981"
      });

      await Swal.fire({
        title: '¡Cobrado!',
        text: 'El turno se marcó como pagado y se registró en caja.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      if (onUpdate) onUpdate();
      handleClose();

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo procesar el cobro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLER: ELIMINAR ---
  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '¿Cancelar Turno?',
      text: "Esto liberará el horario en la agenda.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await deleteDocument("appointments", appointment.id);
        Swal.fire('Cancelado', 'El turno ha sido eliminado correctamente.', 'success');
        if (onUpdate) onUpdate();
        handleClose();
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Helpers de fecha visual
  const startDate = appointment.start ? new Date(appointment.start) : new Date();
  const endDate = appointment.end ? new Date(appointment.end) : new Date();

  const timeString = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const dateString = startDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static">
      {/* Header con color dinámico según estado */}
      <Modal.Header closeButton className={`border-0 ${isPaid ? "bg-success text-white" : "bg-light"}`}>
        <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
          {isPaid ? <CashCoin /> : <CalendarEvent />}
          {isPaid ? "Turno Pagado" : "Detalles del Turno"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* Título y Servicio */}
        <div className="mb-4">
          <h4 className="fw-bold mb-1">{appointment.title}</h4>
          <div className="text-muted d-flex align-items-center gap-2">
            <span className="text-capitalize">{dateString}</span>
            <span>•</span>
            <span className="fw-bold text-dark">{timeString}</span>
          </div>
        </div>

        {/* Info Cliente y Recurso */}
        <div className="bg-light p-3 rounded mb-4 border-start border-4 border-primary">
          <Row className="g-3">
            <Col xs={12} sm={6}>
              <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Cliente</small>
              <div className="d-flex align-items-center gap-2">
                <Person className="text-primary" />
                <span className="fw-500">{appointment.client}</span>
              </div>
              {appointment.clientPhone && (
                <a href={`https://wa.me/${appointment.clientPhone}`} target="_blank" rel="noreferrer" className="small text-success text-decoration-none ms-4 d-block">
                  WhatsApp
                </a>
              )}
            </Col>
            <Col xs={12} sm={6}>
              <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>{sector.resourceLabel}</small>
              <div className="fw-500">{appointment.resourceName || "Sin asignar"}</div>
            </Col>
          </Row>
        </div>

        {/* Info Extra (Vehículo) */}
        {appointment.vehiclePlate && (
          <Alert variant="secondary" className="d-flex align-items-center gap-3 py-2">
            <CarFront size={20} />
            <div>
              <strong>{appointment.vehicleModel}</strong>
              <span className="mx-2">|</span>
              <span className="font-monospace">{appointment.vehiclePlate}</span>
            </div>
          </Alert>
        )}

        {/* Resumen Financiero */}
        <div className={`p-3 rounded border mb-4 ${isPaid ? 'bg-success bg-opacity-10 border-success' : 'bg-warning bg-opacity-10 border-warning'}`}>
          <div className="d-flex justify-content-between mb-1">
            <span>Valor del Servicio:</span>
            <span className="fw-bold">${price}</span>
          </div>
          <div className="d-flex justify-content-between mb-2 text-muted" style={{ fontSize: '0.9rem' }}>
            <span>A cuenta / Seña:</span>
            <span>- ${deposit}</span>
          </div>
          <div className="border-top border-secondary border-opacity-25 pt-2 d-flex justify-content-between align-items-center">
            <span className="fw-bold">Saldo Pendiente:</span>
            <span className={`fs-4 fw-bold ${pendingAmount > 0 ? 'text-danger' : 'text-success'}`}>
              ${pendingAmount}
            </span>
          </div>
        </div>

        {/* Notas */}
        {appointment.notes && (
          <div className="mb-4">
            <small className="text-muted fw-bold">Notas:</small>
            <p className="small bg-light p-2 rounded border-0 text-secondary fst-italic">
              "{appointment.notes}"
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className="d-grid gap-2">
          {!isPaid && (
            <Button
              variant="success"
              size="lg"
              className="fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
              onClick={handleCheckOut}
              disabled={loading}
            >
              {loading ? <Spinner size="sm" /> : <><CashCoin size={20} /> Cobrar ${pendingAmount}</>}
            </Button>
          )}

          <Button
            variant="outline-danger"
            className="border-0 text-muted hover-danger mt-2"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash className="me-1" /> Cancelar este turno
          </Button>
        </div>

      </Modal.Body>

      <style>{`
        .hover-danger:hover { color: #dc3545 !important; background-color: #fee2e2; }
      `}</style>
    </Modal>
  );
}