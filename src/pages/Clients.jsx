import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MainLayout from "../layouts/MainLayout";
import { Table, Button, Form, Card, Modal, Row, Col, Spinner, Badge } from "react-bootstrap";
import { Search, Whatsapp, Pencil, Trash, PersonPlus } from "react-bootstrap-icons";
import { useAuth } from "../contexts/AuthContext";
import { getMyBusiness, getCollection, saveDocument, deleteDocument, updateDocument, exportToCSV } from "../services/dbService";
import Swal from 'sweetalert2';
import ClientDetailsModal from '../components/ClientDetailsModal';

const INITIAL_FORM_STATE = { name: "", phone: "", email: "", notes: "" };

export default function Clients() {
  const { currentUser } = useAuth();

  // Estados de Datos
  const [tenant, setTenant] = useState(null);
  const [clients, setClients] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estados de UI y Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Estado del Formulario
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Función para cargar clientes
  const loadClients = useCallback(async (tenantId) => {
    try {
      const data = await getCollection("clients", tenantId);
      const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
      setClients(sorted);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    }
  }, []);

  // 1. Cargar Datos Iniciales
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!currentUser) return;
      try {
        const business = await getMyBusiness(currentUser.uid, currentUser.email);
        if (isMounted) {
          setTenant(business);
          if (business?.id) {
            await loadClients(business.id);
          }
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
        Swal.fire('Error', 'No se pudieron cargar los datos del negocio.', 'error');
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    init();

    return () => { isMounted = false; };
  }, [currentUser, loadClients]);



  // Recargar clientes wrapper
  const handleReloadClients = async () => {
    if (tenant?.id) {
      await loadClients(tenant.id);
    }
  };

  // Filtrado optimizado con useMemo
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(term) ||
      (client.phone && client.phone.includes(term)) ||
      (client.email && client.email.toLowerCase().includes(term))
    );
  }, [clients, searchTerm]);

  // Handlers del Formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(INITIAL_FORM_STATE);
    setShowModal(true);
  };

  const handleOpenEdit = (e, client) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingId(client.id);
    setFormData({
      name: client.name || "",
      phone: client.phone || "",
      email: client.email || "",
      notes: client.notes || ""
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(INITIAL_FORM_STATE);
    setSubmitting(false);
  };

  // Guardar Cliente
  const handleSave = async (e) => {
    e.preventDefault();

    if (!tenant?.id) return Swal.fire('Error', 'Información del negocio no disponible.', 'error');
    if (!formData.name.trim()) return Swal.fire('Atención', 'El nombre es obligatorio.', 'warning');

    setSubmitting(true);
    try {
      const cleanPhone = formData.phone.replace(/[^0-9+]/g, '');
      const dataToSave = {
        ...formData,
        phone: cleanPhone,
        tenantId: tenant.id,
        // Añadir timestamps si es creación
        ...(isEditing ? { updatedAt: new Date() } : { createdAt: new Date() })
      };

      // Validación de duplicados (solo teléfono y si no está vacío)
      if (!isEditing && cleanPhone) {
        const exists = clients.some(c => c.phone === cleanPhone);
        if (exists) {
          setSubmitting(false);
          return Swal.fire('Duplicado', 'Ya existe un cliente con este teléfono.', 'warning');
        }
      }

      if (isEditing) {
        await updateDocument("clients", editingId, dataToSave);
      } else {
        await saveDocument("clients", dataToSave);
      }

      await handleReloadClients();
      handleCloseModal();

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Cliente actualizado' : 'Cliente creado',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });

    } catch (error) {
      console.error("Error al guardar cliente:", error);
      Swal.fire('Error', 'Hubo un problema al guardar los datos.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar Cliente
  const handleDelete = async (e, id) => {
    e.stopPropagation();

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción eliminará al cliente permanentemente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await deleteDocument("clients", id);
        // Actualización optimista
        setClients(prev => prev.filter(c => c.id !== id));

        Swal.fire({
          title: 'Eliminado',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000
        });
      } catch (error) {
        console.error("Error al eliminar cliente:", error);
        Swal.fire('Error', 'No se pudo eliminar el cliente.', 'error');
      }
    }
  };

  // Detalles del Cliente
  const handleOpenDetails = (client) => {
    setSelectedClient(client);
    setShowDetails(true);
  };

  return (
    <MainLayout>
      {/* Header Sección */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 animate__animated animate__fadeIn">
        <div>
          <h2 className="fw-bold text-dark mb-0">Gestión de Clientes</h2>
          <p className="text-muted mb-0">{clients.length} clientes registrados</p>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-success"
            className="shadow-sm d-flex align-items-center"
            onClick={() => exportToCSV(clients, `clientes-${new Date().toISOString().slice(0, 10)}`)}
            disabled={clients.length === 0}
          >
            📥 <span className="d-none d-md-inline ms-2">Exportar CSV</span>
          </Button>

          <Button variant="primary" className="shadow-sm d-flex align-items-center" onClick={handleOpenCreate}>
            <PersonPlus className="me-2" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Panel Principal */}
      <Card className="border-0 shadow-sm animate__animated animate__fadeInUp">
        <Card.Body className="p-0">

          {/* Barra de Filtros */}
          <div className="p-3 border-bottom bg-light d-flex align-items-center">
            <div className="input-group" style={{ maxWidth: "400px" }}>
              <span className="input-group-text bg-white border-end-0 text-muted">
                <Search />
              </span>
              <Form.Control
                placeholder="Buscar por nombre, teléfono o email..."
                className="border-start-0 ps-0 shadow-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <Button variant="link" className="text-decoration-none ms-2 text-muted" onClick={() => setSearchTerm("")}>
                Limpiar
              </Button>
            )}
          </div>

          {/* Tabla de Datos */}
          {loadingData ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" role="status" />
              <p className="mt-2 text-muted small">Cargando cartera de clientes...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="bg-light text-secondary small text-uppercase">
                  <tr>
                    <th className="ps-4 border-0">Cliente</th>
                    <th className="border-0">Contacto</th>
                    <th className="d-none d-md-table-cell border-0">Notas</th>
                    <th className="text-end pe-4 border-0" style={{ minWidth: '100px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map(client => (
                    <tr
                      key={client.id}
                      style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                      onClick={() => handleOpenDetails(client)}
                    >
                      <td className="ps-4">
                        <div className="d-flex align-items-center">
                          <div
                            className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold"
                            style={{ width: 40, height: 40, fontSize: '1.1rem' }}
                          >
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{client.name}</div>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                              ID: {client.id.substring(0, 6)}...
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {client.email && (
                          <div className="small text-muted mb-1 d-flex align-items-center gap-1">
                            ✉️ {client.email}
                          </div>
                        )}
                        {client.phone ? (
                          <div className="d-flex align-items-center mt-1">
                            <Badge bg="success" className="me-2 rounded-pill bg-opacity-10 text-success border border-success fw-normal">
                              📱 {client.phone}
                            </Badge>
                            <a
                              href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-success hover-scale p-1"
                              title="Enviar WhatsApp"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Whatsapp size={18} />
                            </a>
                          </div>
                        ) : <span className="text-muted small fst-italic">- Sin teléfono -</span>}
                      </td>
                      <td className="d-none d-md-table-cell text-muted small">
                        {client.notes ? (
                          <div className="text-truncate" style={{ maxWidth: '250px' }} title={client.notes}>
                            📝 {client.notes}
                          </div>
                        ) : <span className="opacity-50">-</span>}
                      </td>
                      <td className="text-end pe-4">
                        <Button
                          variant="link"
                          className="text-secondary p-1 me-1 hover-primary"
                          title="Editar"
                          onClick={(e) => handleOpenEdit(e, client)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="link"
                          className="text-muted p-1 hover-danger"
                          title="Eliminar"
                          onClick={(e) => handleDelete(e, client.id)}
                        >
                          <Trash size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-5">
                        <div className="text-muted mb-3 opacity-50" style={{ fontSize: '2.5rem' }}>🔍</div>
                        <h6 className="text-muted fw-bold">No se encontraron clientes</h6>
                        <p className="text-muted small mb-0">Intenta con otra búsqueda o agrega un nuevo registro.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal Crear / Editar */}
      <Modal show={showModal} onHide={handleCloseModal} centered backdrop="static">
        <Modal.Header closeButton className={isEditing ? "bg-warning bg-opacity-10" : "bg-primary bg-opacity-10"}>
          <Modal.Title className={`fs-5 fw-bold ${isEditing ? "text-dark" : "text-primary"}`}>
            {isEditing ? "✏️ Editar Cliente" : "👤 Nuevo Cliente"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">Nombre Completo <span className="text-danger">*</span></Form.Label>
              <Form.Control
                name="name"
                required
                autoFocus
                placeholder="Ej: Juan Pérez"
                value={formData.name}
                onChange={handleChange}
                className="form-control-lg fs-6"
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted text-uppercase">Teléfono / WhatsApp</Form.Label>
                  <Form.Control
                    name="phone"
                    type="tel"
                    placeholder="Ej: 54911..."
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  <Form.Text className="text-muted sx-small">Solo números.</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted text-uppercase">Email</Form.Label>
                  <Form.Control
                    name="email"
                    type="email"
                    placeholder="cliente@mail.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-muted text-uppercase">Notas Internas</Form.Label>
              <Form.Control
                name="notes"
                as="textarea"
                rows={3}
                placeholder="Datos importantes, preferencias, etc..."
                value={formData.notes}
                onChange={handleChange}
              />
            </Form.Group>

            <div className="d-grid gap-2">
              <Button type="submit" disabled={submitting} size="lg" variant={isEditing ? "warning" : "primary"} className="fw-bold shadow-sm">
                {submitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : (isEditing ? "Guardar Cambios" : "Registrar Cliente")}
              </Button>
              <Button variant="link" className="text-muted text-decoration-none" onClick={handleCloseModal} disabled={submitting}>
                Cancelar
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal Detalles */}
      <ClientDetailsModal
        show={showDetails}
        handleClose={() => setShowDetails(false)}
        client={selectedClient}
        tenant={tenant}
        onUpdate={handleReloadClients}
      />

      {/* Estilos CSS Inline */}
      <style>{`
        .hover-scale:hover { transform: scale(1.2); transition: transform 0.2s; }
        .hover-primary:hover { color: #0d6efd !important; background-color: #e7f1ff; border-radius: 4px; }
        .hover-danger:hover { color: #dc3545 !important; background-color: #fee2e2; border-radius: 4px; }
        .sx-small { font-size: 0.75rem; }
      `}</style>
    </MainLayout>
  );
}