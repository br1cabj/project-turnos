import React, { useState } from "react";
import { Modal, Button, Badge, Row, Col } from "react-bootstrap";
import { CashCoin, Trash, Link45deg, Star } from "react-bootstrap-icons";
import { saveDocument, updateDocument, deleteDocument } from "../services/dbService";
import Swal from "sweetalert2";
import { useSector } from "../hooks/useSector";


export default function AppointmentDetailsModal({ show, handleClose, appointment, onUpdate, tenant }) {
  const [loading, setLoading] = useState(false);
  const sector = useSector(tenant)
  if (!appointment) return null

  //Cobro
  const handleCheckOut = async () => {
    // Calculamos cuánto falta pagar
    const pendingAmount = appointment.price - (appointment.deposit || 0);

    if (pendingAmount <= 0) return Swal.fire('Pagado', 'Este turno ya está pagado.', 'info');

    const result = await Swal.fire({
      title: `¿Cobrar Saldo?`,
      html: `Total: $${appointment.price}<br>Pagado: $${appointment.deposit || 0}<br><b>A Cobrar: $${pendingAmount}</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      confirmButtonText: `Cobrar $${pendingAmount}`,
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      // 1. Registrar el ingreso 
      await saveDocument("movements", {
        tenantId: appointment.tenantId,
        description: `Saldo restante: ${appointment.title} - ${appointment.client}`,
        amount: Number(pendingAmount),
        type: "income",
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        appointmentId: appointment.id
      });

      // 2. Actualizar el turno a PAGADO TOTAL
      await updateDocument("appointments", appointment.id, {
        status: "paid",
        deposit: Number(appointment.price),
        balance: 0,
        bgColor: "#d1fae5",
        textColor: "#065f46",
        borderColor: "#10b981"
      });

      await Swal.fire('¡Completado!', 'El turno ha sido saldado.', 'success');
      handleClose();
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cobrar', 'error');
    }
    setLoading(false);
  };

  // Borrar Turno
  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '¿Cancelar Turno?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await deleteDocument("appointments", appointment.id);

        await Swal.fire('Eliminado', 'El turno ha sido cancelado.', 'success');

        handleClose();
        if (onUpdate) onUpdate();
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar', 'error');
      }
      setLoading(false);
    }
  }

  const isPaid = appointment.status === "paid";

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className={isPaid ? "bg-success text-white" : ""}>
        <Modal.Title>
          {isPaid ? "✅ Turno Cobrado" : "Detalles del Turno"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h4 className="fw-bold mb-3">{appointment.title}</h4>

        <Row className="mb-3">
          <Col xs={6}>
            <small className="text-muted d-block">Cliente</small>
            <span className="fs-5">👤 {appointment.client}</span>
          </Col>
          <Col xs={6}>
            <small className="text-muted d-block">Precio</small>
            <span className="fs-5 fw-bold text-success">${appointment.price}</span>
          </Col>
        </Row>

        {/* DATOS DEL VEHÍCULO (Solo si es Taller) */}
        {appointment.vehiclePlate && (
          <div className="alert alert-secondary py-2 px-3 mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <span><strong>🚗 Vehículo:</strong> {appointment.vehicleModel}</span>
              <span className="badge bg-dark">{appointment.vehiclePlate}</span>
            </div>
          </div>
        )}

        <Row className="mb-4">
          <Col xs={6}>
            <small className="text-muted d-block">{sector.resourceLabel}</small>
            <span>{appointment.resourceName}</span>
          </Col>
          <Col xs={6}>
            <small className="text-muted d-block">Horario</small>
            <span>
              {new Date(appointment.start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
              {" - "}
              {new Date(appointment.end).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
              {" hs"}
            </span>
          </Col>
        </Row>

        {/* ESTADO DE CUENTA */}
        <div className="bg-light p-3 rounded border mb-3">
          <div className="d-flex justify-content-between mb-1">
            <span>Total del Servicio:</span>
            <span className="fw-bold">${appointment.price}</span>
          </div>
          <div className="d-flex justify-content-between mb-1 text-success">
            <span>Pagado / Seña:</span>
            <span>- ${appointment.deposit || 0}</span>
          </div>
          <div className="border-top pt-2 d-flex justify-content-between fs-5">
            <span className="fw-bold text-danger">Resta Pagar:</span>
            <span className="fw-bold text-danger">
              ${appointment.price - (appointment.deposit || 0)}
            </span>
          </div>
        </div>

        {/* BOTONES */}
        <div className="d-grid gap-2">
          {!isPaid ? (
            <Button
              variant="success"
              size="lg"
              onClick={handleCheckOut}
              disabled={loading}
            >
              <CashCoin className="me-2" />
              Cobrar ${appointment.price}
            </Button>
          ) : (
            <div className="alert alert-success text-center m-0">
              Este turno ya fue cobrado.
            </div>
          )}

          <Button
            variant="outline-danger"
            className="mt-2"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash className="me-2" /> Cancelar Turno
          </Button>
        </div>

      </Modal.Body>
    </Modal>
  );
}
