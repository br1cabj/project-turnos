import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Table, Button, Form, Card, Row, Col, Modal, Badge } from 'react-bootstrap';
import { Wallet2, ArrowUpCircle, ArrowDownCircle, PlusCircle, DashCircle } from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext';
import { getMyBusiness, getCollection, saveDocument, deleteDocument } from '../services/dbService';

export default function CashRegister() {
  const { currentUser } = useAuth();
  const [tenant, setTenant] = useState(null);

  //Datos
  const [movements, setMovements] = useState([]);
  const [balance, setBalance] = useState({ income: 0, expense: 0, total: 0 })

  //Modal
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('income')

  //Formulario
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  })

  const calculateBalance = (data) => {
    let inc = 0;
    let exp = 0;
    data.forEach(m => {
      if (m.type === 'income') inc += Number(m.amount);
      else exp += Number(m.amount);
    });
    setBalance({ income: inc, expense: exp, total: inc - exp });
  };

  const loadMovements = async (tenantId) => {
    // TODO: filtrar por mes/dia another dia.
    const data = await getCollection("movements", tenantId);
    //sort
    const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setMovements(sorted);
    calculateBalance(sorted);
    ;
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

  //Guardar movimientos
  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveDocument("movements", {
        ...formData,
        amount: Number(formData.amount),
        type,
        tenantId: tenant.id,
        createdAt: new Date()
      });

      await loadMovements(tenant.id);
      setShowModal(false);
      setFormData({ description: "", amount: "", date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    }
    setLoading(false);
  };

  const openModal = (movementType) => {
    setType(movementType);
    setShowModal(true);
  };
  return (
    <MainLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Caja y Movimientos</h2>
        <div>
          <Button variant="outline-danger" className="me-2" onClick={() => openModal("expense")}>
            <DashCircle className="me-2" /> Registrar Gasto
          </Button>
          <Button variant="success" onClick={() => openModal("income")}>
            <PlusCircle className="me-2" /> Ingreso Extra
          </Button>
        </div>
      </div>

      {/* TARJETAS */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm border-start border-4 border-success">
            <Card.Body>
              <div className="text-muted small text-uppercase fw-bold">Ingresos Totales</div>
              <div className="d-flex align-items-center mt-2">
                <ArrowUpCircle className="text-success fs-1 me-3" />
                <h2 className="mb-0 fw-bold">${balance.income.toLocaleString()}</h2>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm border-start border-4 border-danger">
            <Card.Body>
              <div className="text-muted small text-uppercase fw-bold">Gastos Totales</div>
              <div className="d-flex align-items-center mt-2">
                <ArrowDownCircle className="text-danger fs-1 me-3" />
                <h2 className="mb-0 fw-bold">${balance.expense.toLocaleString()}</h2>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className={`border-0 shadow-sm border-start border-4 ${balance.total >= 0 ? 'border-primary' : 'border-warning'}`}>
            <Card.Body>
              <div className="text-muted small text-uppercase fw-bold">Balance Neto</div>
              <div className="d-flex align-items-center mt-2">
                <Wallet2 className="text-primary fs-1 me-3" />
                <h2 className="mb-0 fw-bold">${balance.total.toLocaleString()}</h2>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* TABLA DE MOVIMIENTOS */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <h5 className="fw-bold mb-3">Historial de Transacciones</h5>
          <Table hover responsive className="align-middle">
            <thead className="bg-light">
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th className="text-end">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td className="text-muted">{m.date}</td>
                  <td className="fw-500">{m.description}</td>
                  <td>
                    {m.type === 'income' ? (
                      <Badge bg="success" className="rounded-pill">Ingreso</Badge>
                    ) : (
                      <Badge bg="danger" className="rounded-pill">Gasto</Badge>
                    )}
                  </td>
                  <td className={`text-end fw-bold ${m.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {m.type === 'income' ? '+' : '-'} ${Number(m.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr><td colSpan="4" className="text-center py-4 text-muted">No hay movimientos registrados.</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* MODAL DE CARGA */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton className={type === 'income' ? 'bg-success text-white' : 'bg-danger text-white'}>
          <Modal.Title>
            {type === 'income' ? '🤑 Registrar Ingreso' : '💸 Registrar Gasto'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                required
                autoFocus
                placeholder={type === 'income' ? "Ej: Venta de producto" : "Ej: Pago de alquiler"}
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

            <div className="d-grid gap-2">
              <Button
                variant={type === 'income' ? 'success' : 'danger'}
                type="submit"
                disabled={loading}
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


