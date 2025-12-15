import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../layouts/MainLayout';
import { Table, Button, Form, Card, Row, Col, Modal, Badge, Spinner } from 'react-bootstrap';
import {
  Wallet2,
  ArrowUpCircle,
  ArrowDownCircle,
  PlusCircle,
  DashCircle,
  Trash,
  Funnel,
  CalendarCheck,
  FileEarmarkSpreadsheet
} from 'react-bootstrap-icons';
import { useAuth } from '../contexts/AuthContext';
import { getMyBusiness, getCollection, saveDocument, deleteDocument, exportToCSV } from '../services/dbService';
import Swal from 'sweetalert2';

// --- HELPERS ---

const getLocalDateString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

// Formatea moneda local
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

// Formatea fecha legible
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export default function CashRegister() {
  const { currentUser } = useAuth();

  // Estados UI
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('income');

  // Datos
  const [tenant, setTenant] = useState(null);
  const [allMovements, setAllMovements] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(getLocalDateString().slice(0, 7));

  // Formulario
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: getLocalDateString()
  });

  // --- 1. CARGA INICIAL ---
  const loadMovements = async (tenantId) => {
    try {
      const data = await getCollection("movements", tenantId);
      // Ordenar: Más nuevo primero
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAllMovements(sorted);
    } catch (error) {
      console.error("Error cargando movimientos:", error);
    }
  };

  useEffect(() => {
    async function init() {
      if (!currentUser) return;
      try {
        const business = await getMyBusiness(currentUser.uid, currentUser.email);
        setTenant(business);
        if (business?.id) {
          await loadMovements(business.id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setInitialLoading(false);
      }
    }
    init();
  }, [currentUser]);

  // --- 2. CÁLCULOS ---
  const filteredMovements = useMemo(() => {
    if (!selectedMonth) return allMovements;
    return allMovements.filter(m => m.date && m.date.startsWith(selectedMonth));
  }, [allMovements, selectedMonth]);

  const balance = useMemo(() => {
    let inc = 0, exp = 0;
    filteredMovements.forEach(m => {
      const val = Number(m.amount) || 0;
      if (m.type === 'income') inc += val;
      else exp += val;
    });
    return { income: inc, expense: exp, total: inc - exp };
  }, [filteredMovements]);

  // --- 3. HANDLERS ---
  const handleExport = () => {
    if (filteredMovements.length === 0) {
      Swal.fire('Atención', 'No hay datos para exportar en este mes.', 'info');
      return;
    }

    const dataToExport = filteredMovements.map(m => ({
      Fecha: formatDate(m.date),
      Descripción: m.description,
      Tipo: m.type === 'income' ? 'INGRESO' : 'GASTO',
      Monto: m.amount,
      Origen: m.appointmentId ? 'Turno / Cita' : 'Carga Manual',
      Creado_Por: m.createdBy || 'Sistema'
    }));

    exportToCSV(dataToExport, `Reporte_Caja_${selectedMonth}`)
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    Toast.fire({ icon: 'success', title: 'Archivo descargado' });

  }

  const handleOpenModal = (type) => {
    setModalType(type);
    setFormData({
      description: "",
      amount: "",
      date: getLocalDateString()
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    setLoading(true);
    try {
      await saveDocument("movements", {
        ...formData,
        amount: Number(formData.amount),
        type: modalType,
        tenantId: tenant.id,
        createdAt: new Date(),
        isManual: true
      });

      await loadMovements(tenant.id);
      setShowModal(false);

      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      Toast.fire({ icon: 'success', title: 'Movimiento registrado' });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo guardar el movimiento', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (movement) => {
    const isSystemGenerated = !!movement.appointmentId;

    const result = await Swal.fire({
      title: '¿Eliminar registro?',
      html: isSystemGenerated
        ? `<p class="text-danger fw-bold">⚠️ Atención: Este movimiento viene de un turno.</p> Borrarlo aquí NO cancelará el turno, solo afectará la caja.`
        : "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await deleteDocument("movements", movement.id);
        // Actualización optimista local
        setAllMovements(prev => prev.filter(m => m.id !== movement.id));

        Swal.fire({
          title: 'Eliminado',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500
        });
      } catch (error) {
        Swal.fire('Error', 'No se pudo borrar', 'error');
      }
    }
  };

  // --- RENDER ---
  if (initialLoading) {
    return (
      <MainLayout>
        <div className="d-flex justify-content-center align-items-center h-100 p-5">
          <Spinner animation="border" variant="primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 animate__animated animate__fadeIn">
        <div>
          <h2 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
            <Wallet2 className="text-primary" /> Caja Diario
          </h2>
          <p className="text-muted mb-0 small">Gestión de flujo de dinero</p>
        </div>

        {/* CONTROLES */}
        <div className="d-flex flex-wrap gap-2 align-items-center bg-white p-2 rounded shadow-sm border">
          <div className="d-flex align-items-center border-end pe-3 me-2">
            <Funnel className="text-muted me-2" />
            <Form.Control
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border-0 bg-transparent fw-bold p-0 shadow-none"
              style={{ width: '130px', fontSize: '0.9rem' }}
            />
          </div>

          <Button
            variant="outline-success"
            size="sm"
            className="d-flex align-items-center gap-1 me-2"
            onClick={handleExport}
            title="Exportar a Excel/CSV"
          >
            <FileEarmarkSpreadsheet /> <span className="d-none d-lg-inline">Exportar</span>
          </Button>

          <Button variant="outline-danger" size="sm" className="d-flex align-items-center gap-1" onClick={() => handleOpenModal("expense")}>
            <DashCircle /> <span className="d-none d-sm-inline">Gasto</span>
          </Button>
          <Button variant="success" size="sm" className="d-flex align-items-center gap-1" onClick={() => handleOpenModal("income")}>
            <PlusCircle /> <span className="d-none d-sm-inline">Ingreso</span>
          </Button>
        </div>
      </div>

      {/* TARJETAS RESUMEN */}
      <Row className="mb-4 g-3 animate__animated animate__fadeInUp">
        <Col md={4}>
          <Card className="border-0 shadow-sm border-start border-4 border-success h-100 bg-success bg-opacity-10">
            <Card.Body>
              <div className="text-success small text-uppercase fw-bold">Ingresos</div>
              <div className="d-flex align-items-center mt-1">
                <ArrowUpCircle className="text-success fs-3 me-2" />
                <h3 className="mb-0 fw-bold text-dark">{formatCurrency(balance.income)}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm border-start border-4 border-danger h-100 bg-danger bg-opacity-10">
            <Card.Body>
              <div className="text-danger small text-uppercase fw-bold">Gastos</div>
              <div className="d-flex align-items-center mt-1">
                <ArrowDownCircle className="text-danger fs-3 me-2" />
                <h3 className="mb-0 fw-bold text-dark">{formatCurrency(balance.expense)}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className={`border-0 shadow-sm border-start border-4 h-100 ${balance.total >= 0 ? 'border-primary bg-primary bg-opacity-10' : 'border-warning bg-warning bg-opacity-10'}`}>
            <Card.Body>
              <div className={`small text-uppercase fw-bold ${balance.total >= 0 ? 'text-primary' : 'text-dark'}`}>Balance Neto</div>
              <div className="d-flex align-items-center mt-1">
                <Wallet2 className={`fs-3 me-2 ${balance.total >= 0 ? 'text-primary' : 'text-dark'}`} />
                <h3 className={`mb-0 fw-bold ${balance.total < 0 ? 'text-danger' : 'text-dark'}`}>
                  {formatCurrency(balance.total)}
                </h3>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* TABLA DE MOVIMIENTOS */}
      <Card className="border-0 shadow-sm animate__animated animate__fadeIn">
        <Card.Body className="p-0">
          <Table hover responsive className="align-middle mb-0">
            <thead className="bg-light text-muted small text-uppercase">
              <tr>
                <th className="ps-4 py-3">Fecha</th>
                <th className="py-3">Descripción</th>
                <th className="py-3">Tipo</th>
                <th className="text-end py-3">Monto</th>
                <th className="text-center py-3" style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map(m => (
                <tr key={m.id} style={{ transition: 'background-color 0.2s' }}>
                  <td className="ps-4 text-muted fw-bold small">
                    {formatDate(m.date)}
                  </td>
                  <td>
                    <div className="fw-500 text-dark">{m.description}</div>
                    {m.appointmentId && (
                      <Badge bg="light" text="dark" className="border fw-normal mt-1 d-inline-flex align-items-center gap-1">
                        <CalendarCheck size={10} /> Turno
                      </Badge>
                    )}
                  </td>
                  <td>
                    {m.type === 'income' ? (
                      <span className="badge rounded-pill bg-success bg-opacity-10 text-success border border-success fw-normal px-2">
                        Ingreso
                      </span>
                    ) : (
                      <span className="badge rounded-pill bg-danger bg-opacity-10 text-danger border border-danger fw-normal px-2">
                        Gasto
                      </span>
                    )}
                  </td>
                  <td className={`text-end fw-bold ${m.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {m.type === 'income' ? '+' : '-'} {formatCurrency(Number(m.amount))}
                  </td>
                  <td className="text-center">
                    <Button
                      variant="link"
                      className="text-muted p-1 hover-danger"
                      size="sm"
                      onClick={() => handleDelete(m)}
                      title="Eliminar"
                    >
                      <Trash />
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-5">
                    <div className="text-muted opacity-50 mb-2">
                      <Wallet2 size={40} />
                    </div>
                    <p className="text-muted fw-bold mb-0">Sin movimientos</p>
                    <small className="text-muted">No hay registros para este mes.</small>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
        <Modal.Header closeButton className={modalType === 'income' ? 'bg-success text-white' : 'bg-danger text-white'}>
          <Modal.Title className="fw-bold fs-5 d-flex align-items-center gap-2">
            {modalType === 'income' ? <PlusCircle /> : <DashCircle />}
            {modalType === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small text-uppercase">Descripción</Form.Label>
              <Form.Control
                required
                autoFocus
                placeholder={modalType === 'income' ? "Ej: Venta productos, Propina..." : "Ej: Alquiler, Luz, Insumos..."}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="shadow-sm border-0 bg-light"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold text-muted small text-uppercase">Monto ($)</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    min="0"
                    placeholder="0.00"
                    className="fw-bold shadow-sm border-0 bg-light fs-5"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold text-muted small text-uppercase">Fecha</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="shadow-sm border-0 bg-light"
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-grid gap-2 mt-4">
              <Button
                variant={modalType === 'income' ? 'success' : 'danger'}
                type="submit"
                disabled={loading}
                size="lg"
                className="shadow fw-bold"
              >
                {loading ? <Spinner animation="border" size="sm" /> : "Guardar Movimiento"}
              </Button>
              <Button variant="link" className="text-muted text-decoration-none" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* CSS Extra */}
      <style>{`
        .hover-danger:hover { color: #dc3545 !important; background: #fee2e2; border-radius: 4px; }
      `}</style>
    </MainLayout>
  );
}