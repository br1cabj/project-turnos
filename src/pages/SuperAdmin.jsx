import React, { useState, useEffect, useMemo } from "react";
import { Table, Button, Modal, Form, Card, Badge, Container, Row, Col, InputGroup, Spinner, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Plus, Trash, Pencil, Search, Building, HddNetwork, ShieldLock, ShieldCheck, CalendarDate, Download } from "react-bootstrap-icons";
import Swal from "sweetalert2";
import { SECTORS } from '../config/sectorConfig';

import {
  getAllTenants,
  createTenant,
  deleteTenantFully,
  updateTenantData,
  updateDocument,
  exportToCSV,
  getCollection
} from "../services/dbService";

// --- HELPERS ---
const formatDate = (timestamp) => {
  if (!timestamp) return "-";
  // Manejo robusto de fechas de Firebase o JS Date
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleDateString('es-AR');
};

const getSectorInfo = (sectorKey) => {
  return SECTORS[sectorKey] || { label: 'Genérico', icon: '🏢' };
};

export default function SuperAdmin() {
  // Estado de Datos
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");

  // Modal y Formulario
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    ownerEmail: "",
    phone: "",
    sector: 'generic'
  });

  // 1. CARGA INICIAL
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await getAllTenants();
      const sorted = data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTenants(sorted);
    } catch (error) {
      console.error("Error cargando tenants:", error);
      Swal.fire('Error', 'No se pudo cargar la lista de negocios', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. FILTRADO Y MÉTRICAS
  const filteredTenants = useMemo(() => {
    if (!searchTerm) return tenants;
    const term = searchTerm.toLowerCase();
    return tenants.filter(t =>
      t.name?.toLowerCase().includes(term) ||
      t.slug?.toLowerCase().includes(term) ||
      t.ownerEmail?.toLowerCase().includes(term)
    );
  }, [tenants, searchTerm]);

  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter(t => t.status === 'active').length;
    const suspended = tenants.filter(t => t.status !== 'active').length;
    return { total, active, suspended };
  }, [tenants]);

  // 3. HANDLERS FORMULARIO
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === "name" && !isEditing) {
        newData.slug = value
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]+/g, "");
      }
      return newData;
    });
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({ name: "", slug: "", ownerEmail: "", phone: "", sector: 'generic' });
    setShowModal(true);
  };

  const handleEdit = (tenant) => {
    setIsEditing(true);
    setEditId(tenant.id);
    setFormData({
      name: tenant.name || "",
      slug: tenant.slug || "",
      ownerEmail: tenant.ownerEmail || "",
      phone: tenant.phone || "",
      sector: tenant.sector || "generic"
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.ownerEmail) {
      return Swal.fire("Atención", "Nombre, URL y Email son obligatorios", "warning");
    }

    setProcessing(true);
    try {
      if (!isEditing) {
        if (tenants.some(t => t.slug === formData.slug)) {
          throw new Error("Ya existe un negocio con esa URL (slug).");
        }
        await createTenant(formData);
        Swal.fire("¡Éxito!", "Nuevo negocio registrado.", "success");
      } else {
        await updateTenantData(editId, formData);
        Swal.fire("¡Éxito!", "Datos del negocio actualizados.", "success");
      }
      setShowModal(false);
      loadTenants();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", error.message || "Hubo un problema al guardar.", "error");
    } finally {
      setProcessing(false);
    }
  };

  // 4. ACCIONES ADMINISTRATIVAS
  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "⚠ ELIMINACIÓN TOTAL",
      html: "Estás a punto de borrar este negocio y <b>TODOS</b> sus datos (clientes, turnos, caja).<br/>Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sí, destruir datos"
    });

    if (res.isConfirmed) {
      setProcessing(true);
      try {
        await deleteTenantFully(id);
        Swal.fire("Eliminado", "La base de datos del negocio ha sido eliminada.", "success");
        loadTenants();
      } catch (error) {
        Swal.fire("Error", "No se pudo completar la eliminación.", "error");
      }
      setProcessing(false);
    }
  };

  const toggleStatus = async (tenant) => {
    const current = tenant.status || "suspended";
    const newStatus = current === "active" ? "suspended" : "active";
    const action = newStatus === "active" ? "Reactivar" : "Suspender";

    const res = await Swal.fire({
      title: `¿${action} Acceso?`,
      text: newStatus === 'active' ? 'El negocio podrá volver a operar.' : 'El dueño y sus empleados perderán acceso.',
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: newStatus === "active" ? "#198754" : "#ffc107",
      confirmButtonText: `Sí, ${action}`
    });

    if (res.isConfirmed) {
      try {
        await updateDocument("tenants", tenant.id, { status: newStatus });
        // Actualización optimista
        setTenants(prev => prev.map(t => (t.id === tenant.id ? { ...t, status: newStatus } : t)));
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        Toast.fire({ icon: 'success', title: `Estado: ${newStatus.toUpperCase()}` });
      } catch (error) {
        Swal.fire("Error", "No se pudo cambiar el estado", "error");
      }
    }
  };

  const handleExtendTrial = async (tenant) => {
    const currentDate = tenant.trialEndsAt?.seconds ? new Date(tenant.trialEndsAt.seconds * 1000) : new Date();
    const formatted = currentDate.toISOString().split("T")[0];

    const { value: newDateStr } = await Swal.fire({
      title: "Modificar Vencimiento",
      html: `Extiende o reduce el tiempo de prueba/suscripción.<br>Actual: <b>${formatDate(currentDate)}</b>`,
      input: "date",
      inputValue: formatted,
      showCancelButton: true,
      confirmButtonText: "Guardar Nueva Fecha"
    });

    if (newDateStr) {
      const newDate = new Date(newDateStr);
      newDate.setHours(23, 59, 59);
      await updateDocument("tenants", tenant.id, { trialEndsAt: newDate });
      Swal.fire("Actualizado", "Suscripción modificada correctamente.", "success");
      loadTenants();
    }
  };

  const handleFullBackup = async (tenantId) => {
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    Toast.fire({ icon: 'info', title: 'Generando archivos CSV...' });

    try {
      const [clients, appts, mov] = await Promise.all([
        getCollection("clients", tenantId),
        getCollection("appointments", tenantId),
        getCollection("movements", tenantId)
      ]);

      if (clients.length) exportToCSV(clients, `backup_clientes_${tenantId}`);
      setTimeout(() => { if (appts.length) exportToCSV(appts, `backup_turnos_${tenantId}`); }, 500);
      setTimeout(() => { if (mov.length) exportToCSV(mov, `backup_caja_${tenantId}`); }, 1000);

    } catch (error) {
      Swal.fire("Error", "Hubo un problema al generar los archivos.", "error");
    }
  };

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", paddingBottom: "50px" }}>
      {/* HEADER TIPO DASHBOARD */}
      <div className="bg-white border-bottom py-4 mb-4 shadow-sm">
        <Container>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <div>
              <h2 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <ShieldLock className="text-primary" /> Panel SuperAdmin
              </h2>
              <p className="text-muted mb-0">MARTILLAZO!!!</p>
            </div>
            <Button variant="primary" size="lg" className="shadow-sm d-flex align-items-center gap-2" onClick={handleOpenCreate}>
              <Plus size={24} /> Nuevo Negocio
            </Button>
          </div>
        </Container>
      </div>

      <Container>
        {/* KPI CARDS */}
        <Row className="g-3 mb-4">
          <Col md={4}>
            <Card className="border-0 shadow-sm border-start border-4 border-primary h-100">
              <Card.Body>
                <div className="text-muted small text-uppercase fw-bold">Total Negocios</div>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <Building className="text-primary fs-3" />
                  <h2 className="mb-0 fw-bold">{stats.total}</h2>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border-0 shadow-sm border-start border-4 border-success h-100">
              <Card.Body>
                <div className="text-muted small text-uppercase fw-bold">Suscripciones Activas</div>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <ShieldCheck className="text-success fs-3" />
                  <h2 className="mb-0 fw-bold">{stats.active}</h2>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border-0 shadow-sm border-start border-4 border-warning h-100">
              <Card.Body>
                <div className="text-muted small text-uppercase fw-bold">Suspendidos / Vencidos</div>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <ShieldLock className="text-warning fs-3" />
                  <h2 className="mb-0 fw-bold">{stats.suspended}</h2>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* CONTENIDO PRINCIPAL */}
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">

            {/* BARRA DE HERRAMIENTAS */}
            <div className="p-3 border-bottom bg-light d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
              <InputGroup style={{ maxWidth: '400px' }}>
                <InputGroup.Text className="bg-white border-end-0"><Search className="text-muted" /></InputGroup.Text>
                <Form.Control
                  placeholder="Buscar negocio, email o slug..."
                  className="border-start-0 shadow-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </InputGroup>
              <div className="text-muted small">
                Mostrando {filteredTenants.length} de {tenants.length} registros
              </div>
            </div>

            {/* TABLA */}
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Cargando base de datos...</p>
              </div>
            ) : (
              <Table hover responsive className="align-middle mb-0">
                <thead className="bg-light text-uppercase small text-muted">
                  <tr>
                    <th className="ps-4">Negocio / Tenant</th>
                    <th>Contacto</th>
                    <th>Rubro</th>
                    <th>Estado / Vencimiento</th>
                    <th className="text-end pe-4">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTenants.map(t => {
                    const sectorInfo = getSectorInfo(t.sector);
                    const isExpired = t.trialEndsAt?.seconds && (new Date() > new Date(t.trialEndsAt.seconds * 1000));

                    return (
                      <tr key={t.id} className={t.status === "suspended" ? "bg-light text-muted" : ""}>
                        <td className="ps-4">
                          <div className="fw-bold text-dark">{t.name}</div>
                          <Badge bg="light" text="dark" className="border fw-normal font-monospace">
                            /{t.slug}
                          </Badge>
                        </td>

                        <td>
                          <div className="d-flex flex-column">
                            <span className="fw-500 text-dark">{t.ownerEmail}</span>
                            <small className="text-muted">{t.phone || "-"}</small>
                          </div>
                        </td>

                        <td>
                          <span title={sectorInfo.label} style={{ fontSize: '1.2rem' }}>
                            {sectorInfo.icon}
                          </span>
                          <span className="ms-2 small d-none d-lg-inline">{sectorInfo.label}</span>
                        </td>

                        <td>
                          <div className="d-flex flex-column align-items-start gap-1">
                            <Badge bg={t.status === "active" ? "success" : "danger"} className="rounded-pill">
                              {t.status === "active" ? "ACTIVO" : "SUSPENDIDO"}
                            </Badge>
                            <small className={`fw-bold ${isExpired ? 'text-danger' : 'text-muted'}`} style={{ fontSize: "0.75rem" }}>
                              {isExpired ? 'Vencido: ' : 'Vence: '} {formatDate(t.trialEndsAt)}
                            </small>
                          </div>
                        </td>

                        <td className="text-end pe-4">
                          <div className="d-flex justify-content-end gap-1">

                            <OverlayTrigger overlay={<Tooltip>Backup CSV</Tooltip>}>
                              <Button size="sm" variant="light" className="text-primary" onClick={() => handleFullBackup(t.id)}>
                                <Download />
                              </Button>
                            </OverlayTrigger>

                            <OverlayTrigger overlay={<Tooltip>Editar Datos</Tooltip>}>
                              <Button size="sm" variant="light" className="text-secondary" onClick={() => handleEdit(t)}>
                                <Pencil />
                              </Button>
                            </OverlayTrigger>

                            <OverlayTrigger overlay={<Tooltip>Extender/Cortar Vencimiento</Tooltip>}>
                              <Button size="sm" variant="light" className="text-info" onClick={() => handleExtendTrial(t)}>
                                <CalendarDate />
                              </Button>
                            </OverlayTrigger>

                            <OverlayTrigger overlay={<Tooltip>{t.status === "active" ? "Suspender Acceso" : "Reactivar Acceso"}</Tooltip>}>
                              <Button
                                size="sm"
                                variant="light"
                                className={t.status === "active" ? "text-warning" : "text-success"}
                                onClick={() => toggleStatus(t)}
                              >
                                <HddNetwork />
                              </Button>
                            </OverlayTrigger>

                            <OverlayTrigger overlay={<Tooltip>Eliminar Definitivamente</Tooltip>}>
                              <Button size="sm" variant="light" className="text-danger" onClick={() => handleDelete(t.id)}>
                                <Trash />
                              </Button>
                            </OverlayTrigger>

                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center p-5 text-muted">
                        <Building size={40} className="mb-3 opacity-50" />
                        <h5>No se encontraron negocios</h5>
                        <p className="small">Intenta con otro término de búsqueda.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* MODAL CREAR/EDITAR */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered backdrop="static">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>{isEditing ? "✏️ Editar Negocio" : "🚀 Nuevo Negocio"}</Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          <Form onSubmit={handleSubmit}>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">Nombre del Negocio</Form.Label>
              <Form.Control
                name="name"
                required
                autoFocus
                placeholder="Ej: Barbería Vikingos"
                value={formData.name}
                onChange={handleChange}
                className="form-control-lg fs-6"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">URL Slug (Identificador)</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light text-muted small">app.com/</InputGroup.Text>
                <Form.Control
                  name="slug"
                  required
                  placeholder="barberia-vikingos"
                  value={formData.slug}
                  disabled={isEditing} // Generalmente el slug no se cambia para no romper links
                  onChange={handleChange}
                />
              </InputGroup>
              <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                Identificador único para la URL de reservas.
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold small text-muted text-uppercase">Email Dueño</Form.Label>
                  <Form.Control
                    name="ownerEmail"
                    type="email"
                    required
                    placeholder="admin@negocio.com"
                    value={formData.ownerEmail}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold small text-muted text-uppercase">Teléfono</Form.Label>
                  <Form.Control
                    name="phone"
                    type="tel"
                    placeholder="Solo números"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-muted text-uppercase">Rubro / Sector</Form.Label>
              <Form.Select
                name="sector"
                value={formData.sector}
                onChange={handleChange}
              >
                {Object.entries(SECTORS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <div className="d-grid gap-2">
              <Button type="submit" size="lg" disabled={processing} variant="primary">
                {processing ? <Spinner size="sm" animation="border" /> : (isEditing ? "Guardar Cambios" : "Dar de Alta")}
              </Button>
              <Button variant="link" className="text-decoration-none text-muted" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}