import React, { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Card, Badge, Container } from "react-bootstrap";
import { Plus, Trash, Pencil } from "react-bootstrap-icons";
import Swal from "sweetalert2";
import { SECTORS } from '../config/sectorConfig'

import {
  getAllTenants,
  createTenant,
  deleteTenantFully,
  updateTenantData,
  updateDocument,
  exportToCSV,
  getCollection
} from "../services/dbService";

export default function SuperAdmin() {
  const [tenants, setTenants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    ownerEmail: "",
    phone: "",
    sector: 'generic'
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const data = await getAllTenants();
      setTenants(data);
    } catch (error) {
      console.error("Error cargando tenants:", error);
    }
  };

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
    setFormData({
      name: "",
      slug: "",
      ownerEmail: "",
      phone: ""
    });
    setShowModal(true);
  };

  const handleEdit = (tenant) => {
    setIsEditing(true);
    setEditId(tenant.id);

    setFormData({
      name: tenant.name || "",
      slug: tenant.slug || "",
      ownerEmail: tenant.ownerEmail || "",
      phone: tenant.phone || ""
    });

    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.slug || !formData.ownerEmail) {
      return Swal.fire("Faltan datos", "Nombre, slug y email son obligatorios", "warning");
    }

    setLoading(true);

    try {
      // CREAR
      if (!isEditing) {
        if (tenants.some(t => t.slug === formData.slug)) {
          throw new Error("Ya existe un negocio con esa URL.");
        }

        await createTenant(formData);
        Swal.fire("Creado", "Negocio agregado correctamente.", "success");
      }

      // EDITAR
      else {
        await updateTenantData(editId, formData);
        Swal.fire("Actualizado", "Datos modificados correctamente.", "success");
      }

      setShowModal(false);
      loadTenants();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", error.message || "Hubo un problema", "error");
    }

    setLoading(false);
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "¿BORRADO DEFINITIVO?",
      text: "Se eliminará el negocio y TODOS sus datos.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Sí, borrar todo"
    });

    if (res.isConfirmed) {
      setLoading(true);

      try {
        await deleteTenantFully(id);
        Swal.fire("Eliminado", "Negocio eliminado correctamente", "success");
        loadTenants();
      } catch (error) {
        Swal.fire("Error", "No se pudo eliminar", "error");
      }

      setLoading(false);
    }
  };

  const toggleStatus = async (tenant) => {
    const current = tenant.status || "suspended";
    const newStatus = current === "active" ? "suspended" : "active";

    const res = await Swal.fire({
      title: newStatus === "active" ? "¿Reactivar?" : "¿Suspender?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: newStatus === "active" ? "#198754" : "#d33",
      confirmButtonText: "Confirmar"
    });

    if (res.isConfirmed) {
      try {
        await updateDocument("tenants", tenant.id, { status: newStatus });

        setTenants(prev =>
          prev.map(t => (t.id === tenant.id ? { ...t, status: newStatus } : t))
        );

        Swal.fire("Listo", `Estado actualizado a ${newStatus}`, "success");
      } catch (error) {
        Swal.fire("Error", "No se pudo actualizar el estado", "error");
      }
    }
  };

  const handleExtendTrial = async (tenant) => {
    const currentDate = tenant.trialEndsAt?.seconds
      ? new Date(tenant.trialEndsAt.seconds * 1000)
      : new Date();

    const formatted = currentDate.toISOString().split("T")[0];

    const { value: newDateStr } = await Swal.fire({
      title: "Modificar vencimiento",
      input: "date",
      inputValue: formatted,
      showCancelButton: true,
      confirmButtonText: "Guardar"
    });

    if (newDateStr) {
      const newDate = new Date(newDateStr);
      newDate.setHours(23, 59, 59);

      await updateDocument("tenants", tenant.id, { trialEndsAt: newDate });

      Swal.fire("Actualizado", "Fecha modificada", "success");
      loadTenants();
    }
  };

  const handleFullBackup = async (tenantId) => {
    Swal.fire({
      title: "Generando backup",
      text: "Esto puede tardar unos segundos...",
      icon: "info",
      timer: 1500,
      showConfirmButton: false
    });

    try {
      const clients = await getCollection("clients", tenantId);
      if (clients.length) exportToCSV(clients, `clientes_${tenantId}`);

      const appts = await getCollection("appointments", tenantId);
      if (appts.length) exportToCSV(appts, `turnos_${tenantId}`);

      const mov = await getCollection("movements", tenantId);
      if (mov.length) exportToCSV(mov, `caja_${tenantId}`);

    } catch (error) {
      Swal.fire("Error", "No se pudo generar el backup", "error");
    }
  };

  const safeDate = (obj) => {
    if (!obj?.seconds) return "-";
    return new Date(obj.seconds * 1000).toLocaleDateString();
  };

  return (
    <div style={{ backgroundColor: "#f0f2f5", minHeight: "100vh", padding: "20px" }}>
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-5">
          <div>
            <h2 className="fw-bold text-dark">Panel Super Admin 🚀</h2>
            <p className="text-muted">Gestiona clientes y sus suscripciones</p>
          </div>
          <Button variant="primary" size="lg" onClick={handleOpenCreate}>
            <Plus className="me-2" /> Alta Nuevo Cliente
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <Card.Body>
            <Table hover responsive className="align-middle">
              <thead className="bg-light">
                <tr>
                  <th>Negocio</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} className={t.status === "suspended" ? "table-danger" : ""}>
                    <td>
                      <div className="fw-bold">{t.name || "Sin nombre"}</div>
                      <small className="text-muted">/{t.slug}</small><br />
                      <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                        Vence: {safeDate(t.trialEndsAt)}
                      </span>
                    </td>

                    <td>
                      {t.ownerEmail}
                      <br />
                      <small className="text-muted">{t.phone}</small>
                    </td>

                    <td>
                      <Badge bg={t.status === "active" ? "success" : "danger"}>
                        {t.status === "active" ? "ACTIVO" : "SUSPENDIDO"}
                      </Badge>
                    </td>

                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <Button size="sm" variant="light" onClick={() => handleFullBackup(t.id)}>
                          💾
                        </Button>
                        <Button size="sm" variant="light" onClick={() => handleEdit(t)}>
                          <Pencil />
                        </Button>
                        <Button size="sm" variant="light" onClick={() => handleExtendTrial(t)}>
                          📅
                        </Button>
                        <Button
                          size="sm"
                          variant={t.status === "active" ? "outline-danger" : "outline-success"}
                          onClick={() => toggleStatus(t)}
                        >
                          {t.status === "active" ? "Bloquear" : "Activar"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(t.id)}>
                          <Trash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {tenants.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center p-4">
                      No hay negocios creados.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>

      {/* MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? "Editar Cliente" : "Alta Nuevo Cliente"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form onSubmit={handleSubmit}>

            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                name="name"
                required
                value={formData.name}
                placeholder="Ej: Barbería Vikingos"
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Slug (URL)</Form.Label>
              <Form.Control
                name="slug"
                required
                value={formData.slug}
                disabled={isEditing}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                name="ownerEmail"
                type="email"
                required
                value={formData.ownerEmail}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Rubro del Negocio</Form.Label>
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

            <Button type="submit" className="w-100" disabled={loading}>
              {loading ? "Guardando..." :
                isEditing ? "Guardar Cambios" : "Crear Negocio"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
