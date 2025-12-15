import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Row, Col, Image, Spinner } from "react-bootstrap";
import { Upload, X, Check, Briefcase, PersonBadge } from "react-bootstrap-icons";

const INITIAL_SERVICE = { name: "", price: "", duration: "" };
const INITIAL_RESOURCE = { name: "", description: "" };

export default function ConfigModal({
  show,
  onHide,
  type,
  itemToEdit,
  onSave,
  processing,
  labels = { service: 'Servicio', resource: 'Recurso' }
}) {
  const isEditing = !!itemToEdit;
  const isService = type === "services";


  // Reiniciar estado al abrir/cerrar
  const [formData, setFormData] = useState(() => {
    if (itemToEdit) {
      return { ...itemToEdit };
    } else {
      return type === "services" ? { ...INITIAL_SERVICE } : { ...INITIAL_RESOURCE };
    }
  });

  const [file, setFile] = useState(null);

  // Inicializamos preview
  const [preview, setPreview] = useState(() => {
    return itemToEdit?.photoUrl || null;
  });

  //  EFECTO DE LIMPIEZA DE MEMORIA
  useEffect(() => {
    return () => {
      if (preview && typeof preview === 'string' && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Manejadores
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      // Creamos URL temporal para preview
      setPreview(URL.createObjectURL(f));
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Enviamos al hook padre
    const success = await onSave(type, formData, file, isEditing, itemToEdit?.id);
    if (success) onHide();
  };

  // Título y colores dinámicos
  const entityLabel = isService ? labels.service : labels.resource;
  const icon = isService ? <Briefcase className="text-primary me-2" /> : <PersonBadge className="text-success me-2" />;

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-5 d-flex align-items-center">
          {icon}
          {isEditing ? "Editar" : "Nuevo"} {entityLabel}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 pt-3">
        <p className="text-muted small mb-4">
          Complete la información para {isEditing ? "actualizar" : "registrar"} el {entityLabel.toLowerCase()}.
        </p>

        <Form onSubmit={handleSubmit}>
          {/* --- NOMBRE (Común) --- */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold small text-uppercase text-muted">Nombre</Form.Label>
            <Form.Control
              required
              autoFocus
              placeholder={`Ej: ${isService ? 'Corte de Pelo' : 'Juan Pérez'}`}
              value={formData.name || ""}
              onChange={e => handleChange('name', e.target.value)}
              className="form-control-lg fs-6"
            />
          </Form.Group>

          {isService ? (
            /* --- CAMPOS DE SERVICIO --- */
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-uppercase text-muted">Duración (min)</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    min="5"
                    step="5"
                    placeholder="30"
                    value={formData.duration || ""}
                    onChange={e => handleChange('duration', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-uppercase text-muted">Precio ($)</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    min="0"
                    placeholder="0.00"
                    value={formData.price || ""}
                    onChange={e => handleChange('price', e.target.value)}
                    className="fw-bold"
                  />
                </Form.Group>
              </Col>
            </Row>
          ) : (
            /* --- CAMPOS DE RECURSO --- */
            <>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold small text-uppercase text-muted">Descripción / Cargo</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Ej: Especialista en coloración"
                  value={formData.description || ""}
                  onChange={e => handleChange('description', e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold small text-uppercase text-muted">Foto de Perfil</Form.Label>

                <div className="d-flex align-items-center gap-3 border rounded p-2 bg-light">
                  {/* Preview Area */}
                  <div className="position-relative">
                    <div className="bg-white rounded-circle border d-flex align-items-center justify-content-center overflow-hidden" style={{ width: 60, height: 60 }}>
                      {preview ? (
                        <Image src={preview} className="w-100 h-100 object-fit-cover" />
                      ) : (
                        <PersonBadge className="text-secondary opacity-50 fs-3" />
                      )}
                    </div>
                    {preview && (
                      <div
                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger cursor-pointer border border-white"
                        onClick={removeFile}
                        style={{ cursor: 'pointer' }}
                      >
                        <X />
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="flex-grow-1">
                    <Form.Label
                      htmlFor="resource-file"
                      className="btn btn-outline-secondary btn-sm mb-0 w-100 text-start d-flex align-items-center justify-content-center gap-2"
                      style={{ cursor: 'pointer' }}
                    >
                      <Upload /> {file ? "Cambiar imagen" : "Subir imagen"}
                    </Form.Label>
                    <Form.Control
                      id="resource-file"
                      type="file"
                      accept="image/*"
                      onChange={handleFile}
                      className="d-none"
                    />
                    <div className="text-muted small mt-1 fst-italic text-center" style={{ fontSize: '0.75rem' }}>
                      Máx 2MB. (JPG, PNG)
                    </div>
                  </div>
                </div>
              </Form.Group>
            </>
          )}

          {/* --- FOOTER --- */}
          <div className="d-grid mt-4 pt-2">
            <Button
              type="submit"
              variant={isService ? 'primary' : 'success'}
              disabled={processing}
              className="py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
            >
              {processing ? (
                <Spinner size="sm" animation="border" />
              ) : (
                <>
                  <Check size={20} /> {isEditing ? "Guardar Cambios" : "Crear Registro"}
                </>
              )}
            </Button>
            <Button variant="link" className="text-muted mt-1 text-decoration-none" onClick={onHide} disabled={processing}>
              Cancelar
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}