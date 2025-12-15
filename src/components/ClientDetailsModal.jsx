import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Tab, Table, Form, Card, Badge } from 'react-bootstrap';
import { FileText, ClockHistory, Plus, PencilSquare, Trash, CheckLg, XLg } from 'react-bootstrap-icons';
import { getClientHistory, getClinicalNotes, addClinicalNote, updateClinicalNote, deleteClinicalNote } from '../services/dbService';
import { useSector } from '../hooks/useSector';
import Swal from 'sweetalert2';

// --- HELPER ---
const parseDate = (dateVal) => {
  if (!dateVal) return new Date(0);
  if (dateVal instanceof Date) return dateVal;
  if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
  return new Date(dateVal);
}

const sortNotesDesc = (noteList) => {
  return [...noteList].sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt))
}

const formatDateTime = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return "Fecha inválida";

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj);
};

export default function ClientDetailsModal({ show, handleClose, client, tenant }) {
  const [activeTab, setActiveTab] = useState('history');
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  const sector = useSector(tenant);

  useEffect(() => {
    const loadData = async () => {
      if (!client || !tenant?.id) return;

      setLoading(true);
      try {
        // Cargar Historial
        const appts = await getClientHistory(tenant.id, client.name);
        appts.sort((a, b) => parseDate(b.start) - parseDate(a.start));
        setAppointments(appts);

        // Cargar Notas Clínicas 
        if (sector.features?.clinicalHistory) {
          const clinicalData = await getClinicalNotes(tenant.id, client.id);
          setNotes(sortNotesDesc(clinicalData));
        }
      } catch (error) {
        console.error("Error cargando detalles del cliente:", error);
      }
      setLoading(false);
    };

    if (show) {
      loadData();
    }
  }, [client, show, tenant, sector]);

  // --- HANDLE ---
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await addClinicalNote(tenant.id, client.id, newNote);
      setNewNote("");

      const updatedNotes = await getClinicalNotes(tenant.id, client.id);
      setNotes(sortNotesDesc(updatedNotes));

      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      Toast.fire({ icon: 'success', title: 'Nota agregada' });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo guardar la nota', 'error');
    }
  };


  const handleDeleteNote = async (noteId) => {
    const result = await Swal.fire({
      title: '¿Eliminar nota?',
      text: "No podrás revertir esta acción",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await deleteClinicalNote(noteId)
        setNotes(prev => prev.filter(n => n.id !== noteId))

        Swal.fire('Eliminado', 'La nota ha sido eliminada.', 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo eliminar la nota', 'error');
      }
    }
  }

  // --- INICIAR EDICIÓN ---
  const startEditing = (note) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  // --- CANCELAR EDICIÓN ---
  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  // --- GUARDAR EDICIÓN ---
  const saveEdit = async (noteId) => {
    if (!editText.trim()) return;

    try {
      await updateClinicalNote(noteId, editText);

      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, text: editText } : n
      ));

      setEditingId(null);

      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      Toast.fire({ icon: 'success', title: 'Nota actualizada' });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo actualizar', 'error');
    }
  };

  // 3. RENDERIZADO CONDICIONAL 
  if (!client) return null;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          👤 {client.name} <br />
          <small className="text-muted fs-6">{client.phone || "Sin teléfono"}</small>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">

          {/* PESTAÑA 1: HISTORIAL DE TURNOS */}
          <Tab eventKey="history" title={<span><ClockHistory className="me-2" /> Historial</span>}>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table responsive hover size="sm" className="align-middle">
                <thead className="bg-light sticky-top">
                  <tr>
                    <th>Fecha</th>
                    <th>Servicio</th>
                    <th>Estado</th>
                    <th className="text-end">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(appt => (
                    <tr key={appt.id}>
                      <td>{parseDate(appt.start).toLocaleDateString()}</td>
                      <td>{appt.title}</td>
                      <td>
                        <Badge bg={appt.status === 'paid' ? 'success' : 'secondary'}>
                          {appt.status === 'paid' ? 'Pagado' : appt.status || 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="text-end fw-bold">${appt.price}</td>
                    </tr>
                  ))}
                  {appointments.length === 0 && !loading && (
                    <tr><td colSpan="4" className="text-center text-muted py-3">Sin historial registrado</td></tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Tab>

          {/* PESTAÑA 2: HISTORIA CLÍNICA (Solo Salud) */}
          {sector.features?.clinicalHistory && (
            <Tab eventKey="clinical" title={<span><FileText className="me-2" /> Historia Clínica</span>}>
              {/* Formulario de Nueva Nota */}
              <div className="bg-light p-3 rounded mb-3 border">
                <Form onSubmit={handleAddNote}>
                  <Form.Group className="mb-2">
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Escribir nueva evolución..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                    />
                  </Form.Group>
                  <div className="d-flex justify-content-end">
                    <Button size="sm" type="submit" variant="primary" disabled={!newNote.trim()}>
                      <Plus className="me-1" /> Agregar Nota
                    </Button>
                  </div>
                </Form>
              </div>

              {/* Lista de Notas */}
              <div className="timeline" style={{ maxHeight: '400px', overflowY: 'auto', minHeight: '100px' }}>
                {notes.map(note => (
                  <Card key={note.id} className="mb-2 border-0 shadow-sm animate__animated animate__fadeIn">
                    <Card.Body className="p-3">

                      {/* HEADER DE LA NOTA (Fecha y Botones) */}
                      <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                        <div className="d-flex flex-column">
                          <span className="fw-bold text-primary small">
                            {formatDateTime(parseDate(note.createdAt))}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {note.createdBy || 'Sistema'}
                          </span>
                        </div>

                        {/* BOTONES DE ACCIÓN */}
                        {editingId !== note.id && (
                          <div>
                            <Button
                              variant="link"
                              className="text-secondary p-0 me-2"
                              title="Editar"
                              onClick={() => startEditing(note)}
                            >
                              <PencilSquare size={16} />
                            </Button>
                            <Button
                              variant="link"
                              className="text-danger p-0"
                              title="Eliminar"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        )}
                      </div>
                      {/* CUERPO DE LA NOTA */}
                      {editingId === note.id ? (
                        <div className="animate__animated animate__fadeIn">
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="mb-2"
                            autoFocus
                          />
                          <div className="d-flex justify-content-end gap-2">
                            <Button size="sm" variant="secondary" onClick={cancelEditing}>
                              <XLg /> Cancelar
                            </Button>
                            <Button size="sm" variant="success" onClick={() => saveEdit(note.id)}>
                              <CheckLg /> Guardar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                          {note.text}
                        </p>
                      )}

                    </Card.Body>
                  </Card>
                ))}

                {notes.length === 0 && !loading && (
                  <div className="text-center text-muted py-3">No hay notas clínicas aún.</div>
                )}
              </div>
            </Tab>
          )}

        </Tabs>
      </Modal.Body>
    </Modal>
  );
}