import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Row, Col, Image } from "react-bootstrap";

export default function ConfigModal({ show, onHide, type, itemToEdit, onSave, processing, labels }) {
  const isEditing = !!itemToEdit;
  const isService = type === "services";

  const [formData, setFormData] = useState({});
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (show) {
      setFormData(itemToEdit || { name: "", price: "", duration: "", description: "" });
      setPreview(itemToEdit?.photoUrl || null);
      setFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, itemToEdit?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onSave(type, formData, file, isEditing, itemToEdit?.id);
    if (success) onHide();
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className={isService ? 'bg-primary text-white' : 'bg-success text-white'}>
        <Modal.Title>{isEditing ? "✏️ Editar" : "✨ Nuevo"} {isService ? labels.service : labels.resource}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Nombre</Form.Label>
            <Form.Control required autoFocus value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </Form.Group>

          {isService ? (
            <Row>
              <Col><Form.Label>Duración (min)</Form.Label><Form.Control type="number" required value={formData.duration || ""} onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })} /></Col>
              <Col><Form.Label>Precio ($)</Form.Label><Form.Control type="number" required value={formData.price || ""} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} /></Col>
            </Row>
          ) : (
            <>
              <Form.Group className="mb-3"><Form.Label>Descripción</Form.Label><Form.Control as="textarea" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} /></Form.Group>
              <Form.Group className="mb-3 d-flex gap-3 align-items-center">
                {preview && <Image src={preview} roundedCircle style={{ width: 50, height: 50, objectFit: 'cover' }} />}
                <Form.Control type="file" accept="image/*" onChange={handleFile} />
              </Form.Group>
            </>
          )}

          <Button type="submit" className="w-100 mt-4" variant={isService ? 'primary' : 'success'} disabled={processing}>
            {processing ? "Guardando..." : "Confirmar"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}