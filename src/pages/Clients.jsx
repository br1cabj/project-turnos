import React, { useState, useEffect } from 'react';
import MainLayout from "../layouts/MainLayout";
import { Table, Button, Form, Card, Modal, Row, Col } from "react-bootstrap";
import { Search, Whatsapp, Pencil, Trash, PersonPlus } from "react-bootstrap-icons";
import { useAuth } from "../contexts/AuthContext";
import { getMyBusiness, getCollection, saveDocument, deleteDocument, exportToCSV } from "../services/dbService";
import Swal from 'sweetalert2';
import ClientDetailsModal from '../components/ClientDetailsModal';

export default function Clients() {
  const { currentUser } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal y Formulario
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

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
            const data = await getCollection("clients", business.id);
            setClients(data);
          }
        } catch (error) {
          console.error("Error cargando datos:", error);
        }
      }
    }
    init();
  }, [currentUser]);

  // Función auxiliar para recargar clientes
  const reloadClients = async () => {
    if (tenant?.id) {
      const data = await getCollection("clients", tenant.id);
      setClients(data);
    }
  };

  // Filtrado 
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.includes(searchTerm))
  );

  // Manejo de Inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Guardar Cliente
  const handleSave = async (e) => {
    e.preventDefault();

    if (!tenant) {
      return Swal.fire('Error', 'No se ha cargado la información del negocio.', 'error');
    }

    setLoading(true);
    try {
      await saveDocument("clients", { ...formData, tenantId: tenant.id });
      await reloadClients();
      setShowModal(false);
      setFormData(initialFormState);

      Swal.fire({
        icon: 'success',
        title: 'Cliente guardado',
        showConfirmButton: false,
        timer: 1500
      });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Hubo un error al guardar el cliente', 'error');
    }
    setLoading(false);
  };

  // Borrar Cliente
  const handleDelete = async (e, id) => {
    e.stopPropagation();

    const result = await Swal.fire({
      title: '¿Borrar cliente?',
      text: "Perderás su historial y datos de contacto.",
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
        Swal.fire('Error', 'No se pudo borrar el cliente', 'error');
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-dark">Clientes</h2>
        <div>
          <Button
            variant="outline-success"
            className="me-2"
            onClick={() => exportToCSV(clients, 'mis-clientes')}
          >
            📥 Exportar Excel
          </Button>

          <Button variant="primary" className="shadow-sm" onClick={() => setShowModal(true)}>
            <PersonPlus className="me-2" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {/* BARRA DE BÚSQUEDA */}
          <div className="mb-4 d-flex">
            <div className="input-group" style={{ maxWidth: "400px" }}>
              <span className="input-group-text bg-light border-end-0">
                <Search className="text-muted" />
              </span>
              <Form.Control
                placeholder="Buscar por nombre o teléfono..."
                className="border-start-0 ps-0 bg-light"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* TABLA DE CLIENTES */}
          <Table hover responsive className="align-middle">
            <thead className="bg-light">
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Notas</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr key={client.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenDetails(client)}>
                  <td>
                    <div className="fw-bold text-primary">{client.name}</div>
                    <small className="text-muted">ID: {client.id.slice(0, 6)}...</small>
                  </td>
                  <td>
                    {client.email && <div className="small text-muted">✉️ {client.email}</div>}
                    {client.phone && (
                      <div className="d-flex align-items-center mt-1">
                        <span className="me-2">📱 {client.phone}</span>
                        <a
                          href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-success"
                          title="Abrir WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Whatsapp />
                        </a>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="text-muted small fst-italic">
                      {client.notes || "-"}
                    </span>
                  </td>
                  <td className="text-end">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={(e) => handleDelete(e, client.id)}
                    >
                      <Trash />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-muted">
                    No se encontraron clientes
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* MODAL NUEVO CLIENTE */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Nuevo Cliente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label>Nombre Completo</Form.Label>
              <Form.Control
                name="name"
                required
                autoFocus
                value={formData.name}
                onChange={handleChange}
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    name="phone"
                    type="tel"
                    placeholder="Ej: 54911..."
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    name="email"
                    type="email"
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
                value={formData.notes}
                onChange={handleChange}
              />
            </Form.Group>

            <Button type="submit" disabled={loading} className="w-100">
              {loading ? "Guardando..." : "Guardar Cliente"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <ClientDetailsModal
        show={showDetails}
        handleClose={() => setShowDetails(false)}
        client={selectedClient}
        tenant={tenant}
      />

    </MainLayout>
  );
}