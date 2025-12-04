import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Table, Button, Form, Card, Row, Col, Modal, Badge } from 'react-bootstrap';
import { Wallet2, ArrowUpCircle, ArrowDownCircle, PlusCircle, DashCircle, Trash, Funnel } from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext';
import { getMyBusiness, getCollection, saveDocument, deleteDocument } from '../services/dbService';
import Swal from 'sweetalert2';

export default function CashRegister() {
  const { currentUser } = useAuth();
  const [tenant, setTenant] = useState(null);

  // Datos
  const [allMovements, setAllMovements] = useState([]);

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('income')

  // Formulario
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Carga inicial
  const loadMovements = async (tenantId) => {
    const data = await getCollection("movements", tenantId);
    // Ordenar por fecha descendente (más nuevo arriba)
    const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setAllMovements(sorted);
  }

  useEffect(() => {
    async function init() {
      if (currentUser) {
        const business = await getMyBusiness(currentUser.uid, currentUser.email);
        setTenant(business);
        if (business) loadMovements(business.id);
      }
    }
    init();
  }, [currentUser]);


  // --- CORRECCIÓN AQUÍ ---
  // 1. Calculamos los movimientos filtrados directamente (sin useState)
  const filteredMovements = useMemo(() => {
    return allMovements.filter(m => m.date.startsWith(selectedMonth));
  }, [allMovements, selectedMonth]);

  // 2. Calculamos el balance basado en la lista filtrada
  const balance = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredMovements.forEach(m => {
      if (m.type === 'income') inc += Number(m.amount);
      else exp += Number(m.amount);
    });

    return { income: inc, expense: exp, total: inc - exp };
  }, [filteredMovements]);
  // -----------------------


  // Guardar movimiento manual
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveDocument("movements", {
        ...formData,
        amount: Number(formData.amount),
        type,
        tenantId: tenant.id,
        createdAt: new Date(),
        isManual: true // Marca para saber que fue manual
      });

      await loadMovements(tenant.id);
      setShowModal(false);
      setFormData({ description: "", amount: "", date: new Date().toISOString().split('T')[0] });

      Swal.fire({
        icon: 'success',
        title: 'Registrado',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
      });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo guardar', 'error');
    }
    setLoading(false);
  };

  // Borrar movimiento
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Borrar movimiento?',
      text: "Esto afectará el balance de caja.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, borrar'
    });

    if (result.isConfirmed) {
      try {
        await deleteDocument("movements", id);
        await loadMovements(tenant.id);
        Swal.fire('Borrado', '', 'success');
      } catch (error) {
        Swal.fire('Error', 'No se pudo borrar', 'error');
      }
    }
  };

  const openModal = (movementType) => {
    setType(movementType);
    setShowModal(true);
  };

  return (
    <MainLayout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-dark mb-0">Caja y Movimientos</h2>
          <p className="text-muted mb-0">Control de ingresos y egresos</p>
        </div>

        {/* SELECTOR DE MES */}
        <div className="d-flex align-items-center bg-white p-2 rounded shadow-sm border">
          <Funnel className="text-muted me-2" />
          <Form.Control
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border-0 bg-transparent fw-bold p-0"
            style={{ width: '140px' }}
          />
        </div>

        <div>
          <Button variant="outline-danger" className="me-2 shadow-sm" onClick={() => openModal("expense")}>
            <DashCircle className="me-2" /> Gasto
          </Button>
          <Button variant="success" className="shadow-sm" onClick={() => openModal("income")}>
            <PlusCircle className="me-2" /> Ingreso
          </Button>
        </div>
      </div>

      {/* TARJETAS DE BALANCE */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="border-0 shadow-sm border-start border-4 border-success h-100">
            <Card.Body>
              <div className="text-muted small text-uppercase fw-bold">Ingresos ({selectedMonth})</div>
              <div className="d-flex align-items-center mt-2">
                <ArrowUpCircle className="text-success fs-1 me-3 opacity-50" />
                <h2 className="mb-0 fw-bold text-dark">${balance.income.toLocaleString()}</h2>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm border-start border-4 border-danger h-100">
            <Card.Body>
              <div className="text-muted small text-uppercase fw-bold">Gastos ({selectedMonth})</div>
              <div className="d-flex align-items-center mt-2">
                <ArrowDownCircle className="text-danger fs-1 me-3 opacity-50" />
                <h2 className="mb-0 fw-bold text-dark">${balance.expense.toLocaleString()}</h2>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className={`border-0 shadow-sm border-start border-4 h-100 ${balance.total >= 0 ? 'border-primary' : 'border-warning'}`}>
            <Card.Body>
              <div className="text-muted small text-uppercase fw-bold">Balance Neto</div>
              <div className="d-flex align-items-center mt-2">
                <Wallet2 className="text-primary fs-1 me-3 opacity-50" />
                <h2 className={`mb-0 fw-bold ${balance.total < 0 ? 'text-danger' : 'text-dark'}`}>
                  ${balance.total.toLocaleString()}
                </h2>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* TABLA DE MOVIMIENTOS */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table hover responsive className="align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Fecha</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th className="text-end">Monto</th>
                <th className="text-center" style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map(m => (
                <tr key={m.id}>
                  <td className="text-muted ps-4" style={{ fontSize: '0.9rem' }}>
                    {/* Formato de fecha local amigable */}
                    {new Date(m.date + 'T00:00:00').toLocaleDateString()}
                  </td>
                  <td className="fw-500">
                    {m.description}
                    {m.appointmentId && <Badge bg="light" text="dark" className="ms-2 border">Turno</Badge>}
                  </td>
                  <td>
                    {m.type === 'income' ? (
                      <Badge bg="success" bg-opacity="10" className="text-success px-2 py-1 rounded-pill border border-success">
                        Ingreso
                      </Badge>
                    ) : (
                      <Badge bg="danger" bg-opacity="10" className="text-danger px-2 py-1 rounded-pill border border-danger">
                        Gasto
                      </Badge>
                    )}
                  </td>
                  <td className={`text-end fw-bold ${m.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {m.type === 'income' ? '+' : '-'} ${Number(m.amount).toLocaleString()}
                  </td>
                  <td className="text-center">
                    <Button
                      variant="link"
                      className="text-muted p-0"
                      size="sm"
                      onClick={() => handleDelete(m.id)}
                      title="Eliminar movimiento"
                    >
                      <Trash />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredMovements.length === 0 && (
                <tr><td colSpan="5" className="text-center py-5 text-muted">
                  <div className="fs-1 mb-2">📭</div>
                  No hay movimientos en este mes.
                </td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* MODAL DE CARGA MANUAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className={type === 'income' ? 'bg-success text-white' : 'bg-danger text-white'}>
          <Modal.Title className="fw-bold fs-5">
            {type === 'income' ? '🤑 Registrar Ingreso Extra' : '💸 Registrar Gasto'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                required
                autoFocus
                placeholder={type === 'income' ? "Ej: Venta de producto" : "Ej: Pago de luz/agua"}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Monto ($)</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    min="0"
                    placeholder="0.00"
                    className="fw-bold"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-grid gap-2 mt-3">
              <Button
                variant={type === 'income' ? 'success' : 'danger'}
                type="submit"
                disabled={loading}
                size="lg"
                className="shadow-sm"
              >
                {loading ? "Guardando..." : "Confirmar Movimiento"}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

    </MainLayout>
  );
}