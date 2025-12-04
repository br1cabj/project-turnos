import React, { useState, useEffect } from 'react';
import MainLayout from "../layouts/MainLayout";
import { Table, Button, Form, Card, Modal, Row, Col, Spinner, Badge } from "react-bootstrap";
import { Search, Whatsapp, Pencil, Trash, PersonPlus, Funnel } from "react-bootstrap-icons";
import { useAuth } from "../contexts/AuthContext";
import { getMyBusiness, getCollection, saveDocument, deleteDocument, updateDocument, exportToCSV } from "../services/dbService";
import Swal from 'sweetalert2';
import ClientDetailsModal from '../components/ClientDetailsModal';

export default function Clients() {
  const { currentUser } = useAuth();
  const [tenant, setTenant] = useState(null);

  // Datos
  const [clients, setClients] = useState([]);
  const [loadingData, setLoadingData] = useState(true); // Nuevo estado de carga inicial

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");

  // Modal y Formulario
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Para diferenciar Crear de Editar
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const initialFormState = { name: "", phone: "", email: "", notes: "" };
  const [formData, setFormData] = useState(initialFormState);

  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // 1. Cargar Datos
  useEffect(() => {
    async function init() {
      if (currentUser) {
        try {
          const business = await getMyBusiness(currentUser.uid, currentUser.email);
          setTenant(business);
          if (business) {
            // Llamamos directamente a la función de DB aquí adentro
            const data = await getCollection("clients", business.id);
            // Ordenamos
            const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
            setClients(sorted);
          }
        } catch (error) {
          console.error("Error cargando datos:", error);
        }
        setLoadingData(false);
      }
    }
    init();
  }, [currentUser]);

  // Función auxiliar para recargar clientes
  const reloadClients = async (tenantId = tenant?.id) => {
    if (tenantId) {
      const data = await getCollection("clients", tenantId);
      // Ordenamos alfabéticamente por nombre
      const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
      setClients(sorted);
    }
  };

  // Filtrado Mejorado (busca en nombre, telefono y email)
  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(term) ||
      (client.phone && client.phone.includes(term)) ||
      (client.email && client.email.toLowerCase().includes(term))
    );
  });

  // Manejo de Inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Preparar Modal para Nuevo Cliente
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialFormState);
    setShowModal(true);
  };

  // Preparar Modal para Editar (Desde la tabla)
  const handleOpenEdit = (e, client) => {
    e.stopPropagation(); // Evita abrir el detalle
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

  // Guardar Cliente (Crear o Editar)
  const handleSave = async (e) => {
    e.preventDefault();

    if (!tenant) return Swal.fire('Error', 'No se ha cargado la información del negocio.', 'error');

    // Validación simple
    if (!formData.name.trim()) return Swal.fire('Atención', 'El nombre es obligatorio', 'warning');

    setSubmitting(true);
    try {
      // Limpieza de datos (Teléfono solo números)
      const cleanPhone = formData.phone.replace(/[^0-9+]/g, '');
      const dataToSave = { ...formData, phone: cleanPhone, tenantId: tenant.id };

      // Verificar duplicados solo si es nuevo
      if (!isEditing) {
        const exists = clients.some(c => c.phone === cleanPhone && c.phone !== "");
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

      await reloadClients();
      setShowModal(false);
      setFormData(initialFormState);

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      Toast.fire({
        icon: 'success',
        title: isEditing ? 'Cliente actualizado' : 'Cliente creado'
      });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un error al guardar', 'error');
    }
    setSubmitting(false);
  };

  // Borrar Cliente
  const handleDelete = async (e, id) => {
    e.stopPropagation();

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Se eliminará este cliente y no podrás recuperarlo.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await deleteDocument("clients", id);
        await reloadClients();
        Swal.fire('Borrado', 'El cliente ha sido eliminado.', 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo borrar', 'error');
      }
    }
  };

  const handleOpenDetails = (client) => {
    setSelectedClient(client);
    setShowDetails(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormState);
  };

  return (
    <MainLayout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-dark mb-0">Gestión de Clientes</h2>
          <p className="text-muted mb-0">{clients.length} clientes registrados</p>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-success"
            className="shadow-sm d-flex align-items-center"
            onClick={() => exportToCSV(clients, 'mis-clientes')}
            disabled={clients.length === 0}
          >
            📥 <span className="d-none d-md-inline ms-2">Exportar</span>
          </Button>

          <Button variant="primary" className="shadow-sm d-flex align-items-center" onClick={handleOpenCreate}>
            <PersonPlus className="me-2" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="p-3 border-bottom bg-light d-flex align-items-center">
            <div className="input-group" style={{ maxWidth: "400px" }}>
              <span className="input-group-text bg-white border-end-0 text-muted">
                <Search />
              </span>
              <Form.Control
                placeholder="Buscar por nombre, teléfono o email..."
                className="border-start-0 ps-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <Button variant="link" className="text-decoration-none ms-2" onClick={() => setSearchTerm("")}>
                Limpiar
              </Button>
            )}
          </div>

          {/* TABLA DE CLIENTES */}
          {loadingData ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Cargando tu cartera de clientes...</p>
            </div>
          ) : (
            <Table hover responsive className="align-middle mb-0">
              <thead className="bg-light text-secondary">
                <tr>
                  <th className="ps-4">Cliente</th>
                  <th>Contacto</th>
                  <th className="d-none d-md-table-cell">Notas</th>
                  <th className="text-end pe-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenDetails(client)}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-bold text-dark">{client.name}</div>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>Registrado el {client.createdAt ? new Date(client.createdAt.seconds * 1000).toLocaleDateString() : '-'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {client.email && <div className="small text-muted mb-1">✉️ {client.email}</div>}
                      {client.phone ? (
                        <div className="d-flex align-items-center">
                          <Badge bg="success" className="me-2 rounded-pill bg-opacity-10 text-success border border-success">
                            📱 {client.phone}
                          </Badge>
                          <a
                            href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-success hover-scale"
                            title="Abrir WhatsApp"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Whatsapp size={18} />
                          </a>
                        </div>
                      ) : <span className="text-muted small">- Sin teléfono -</span>}
                    </td>
                    <td className="d-none d-md-table-cell text-muted small">
                      {client.notes ? (
                        <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📝 {client.notes}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="text-end pe-4">
                      <Button
                        variant="link"
                        className="text-primary p-1 me-2"
                        title="Editar rápido"
                        onClick={(e) => handleOpenEdit(e, client)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="link"
                        className="text-danger p-1"
                        title="Eliminar"
                        onClick={(e) => handleDelete(e, client.id)}
                      >
                        <Trash />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-5">
                      <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>🤷‍♂️</div>
                      <h5 className="text-muted">No encontramos clientes</h5>
                      <p className="text-muted small">Prueba con otra búsqueda o agrega uno nuevo.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* MODAL CREAR / EDITAR */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>{isEditing ? "✏️ Editar Cliente" : "👤 Nuevo Cliente"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Nombre Completo</Form.Label>
              <Form.Control
                name="name"
                required
                autoFocus
                placeholder="Ej: Juan Pérez"
                value={formData.name}
                onChange={handleChange}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Teléfono / WhatsApp</Form.Label>
                  <Form.Control
                    name="phone"
                    type="tel"
                    placeholder="Ej: 54911223344"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  <Form.Text className="text-muted" style={{ fontSize: '0.7rem' }}>
                    Sin espacios ni guiones.
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email (Opcional)</Form.Label>
                  <Form.Control
                    name="email"
                    type="email"
                    placeholder="cliente@email.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Notas Internas</Form.Label>
              <Form.Control
                name="notes"
                as="textarea"
                rows={3}
                placeholder="Preferencias, alergias, datos importantes..."
                value={formData.notes}
                onChange={handleChange}
              />
            </Form.Group>

            <div className="d-grid gap-2 mt-4">
              <Button type="submit" disabled={submitting} size="lg" variant="primary" className="shadow-sm">
                {submitting ? "Guardando..." : (isEditing ? "Actualizar Datos" : "Guardar Cliente")}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <ClientDetailsModal
        show={showDetails}
        handleClose={() => setShowDetails(false)}
        client={selectedClient}
        tenant={tenant}
        // Pasamos reloadClients para que si editas algo en el modal de detalles, se actualice la lista
        onUpdate={reloadClients}
      />

    </MainLayout>
  );
}