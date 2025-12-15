import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Tab, Table, Form, Card, Badge, Spinner } from 'react-bootstrap';
import { FileText, ClockHistory, Plus, PencilSquare, Trash, CheckLg, XLg, CalendarX, JournalX } from 'react-bootstrap-icons';
import { getClientHistory, getClinicalNotes, addClinicalNote, updateClinicalNote, deleteClinicalNote } from '../services/dbService';
import { useSector } from '../hooks/useSector';
import Swal from 'sweetalert2';

const parseDate = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
  return new Date(dateVal);
};

const sortNotesDesc = (noteList) => {
  return [...noteList].sort((a, b) => {
    const dateA = parseDate(a.createdAt) || new Date(0);
    const dateB = parseDate(b.createdAt) || new Date(0);
    return dateB - dateA;
  });
};

const formatDateTime = (dateObj) => {
  if (!dateObj || isNaN(dateObj.getTime())) return "-";
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(dateObj);
};

// Helper para formato de moneda
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount || 0);
};

export default function ClientDetailsModal({ show, handleClose, client, tenant }) {
  // Estados UI
  const [activeTab, setActiveTab] = useState('history');
  const [loading, setLoading] = useState(false);

  // Datos
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);

  // Inputs
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const sector = useSector(tenant);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    let isMounted = true; // Prevención de fugas de memoria

    const loadData = async () => {
      if (!client || !tenant?.id) return;

      if (isMounted) setLoading(true);

      try {
        // 1. Cargar Historial
        const appts = await getClientHistory(tenant.id, client.name);
        // Ordenar historial (Más reciente primero)
        const sortedAppts = [...appts].sort((a, b) => {
          const dateA = parseDate(a.start) || new Date(0);
          const dateB = parseDate(b.start) || new Date(0);
          return dateB - dateA;
        });

        // 2. Cargar Notas (si corresponde)
        let sortedNotes = [];
        if (sector.features?.clinicalHistory) {
          const clinicalData = await getClinicalNotes(tenant.id, client.id);
          sortedNotes = sortNotesDesc(clinicalData);
        }

        if (isMounted) {
          setAppointments(sortedAppts);
          setNotes(sortedNotes);
        }

      } catch (error) {
        console.error("Error cargando detalles:", error);
        if (isMounted) Swal.fire('Error', 'No se pudieron cargar los detalles.', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (show) {
      loadData();
      setActiveTab('history');
      setNewNote("");
      setEditingId(null);
    }

    return () => { isMounted = false; };
  }, [client, show, tenant, sector]);

  // --- HANDLERS NOTAS ---

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await addClinicalNote(tenant.id, client.id, newNote);
      setNewNote("");

      // Recargar notas
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
      text: "Esta acción es irreversible.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
      try {
        await deleteClinicalNote(noteId);
        setNotes(prev => prev.filter(n => n.id !== noteId));

        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 })
          .fire({ icon: 'success', title: 'Nota eliminada' });
      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo eliminar', 'error');
      }
    }
  };

  const startEditing = (note) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async (noteId) => {
    if (!editText.trim()) return;

    try {
      await updateClinicalNote(noteId, editText);

      // Actualización optimista local
      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, text: editText } : n
      ));

      setEditingId(null);

      Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 })
        .fire({ icon: 'success', title: 'Actualizado' });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo actualizar', 'error');
    }
  };

  if (!client) return null;

  // Renderizado del estado del turno
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'paid': return <Badge bg="success">Pagado</Badge>;
      case 'confirmed': return <Badge bg="primary">Confirmado</Badge>;
      case 'cancelled': return <Badge bg="danger">Cancelado</Badge>;
      default: return <Badge bg="secondary">{status || 'Pendiente'}</Badge>;
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <span className="fs-5">👤 {client.name}</span>
          <div className="text-muted fw-normal mt-1" style={{ fontSize: '0.85rem' }}>
            {client.phone ? `📱 ${client.phone}` : "Sin teléfono registrado"}
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 pt-2">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted small">Cargando información del cliente...</p>
          </div>
        ) : (
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3 custom-tabs nav-fill">

            {/* --- PESTAÑA 1: HISTORIAL --- */}
            <Tab eventKey="history" title={<span><ClockHistory className="me-2" /> Historial</span>}>
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <Table responsive hover className="align-middle mb-0">
                  <thead className="bg-light sticky-top text-muted small text-uppercase">
                    <tr>
                      <th className="border-0 ps-3">Fecha</th>
                      <th className="border-0">Servicio</th>
                      <th className="border-0">Estado</th>
                      <th className="border-0 text-end pe-3">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(appt => (
                      <tr key={appt.id}>
                        <td className="ps-3 text-nowrap fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                          {parseDate(appt.start)?.toLocaleDateString() || '-'}
                        </td>
                        <td>
                          <div className="fw-500">{appt.title}</div>
                          <small className="text-muted">{appt.resourceName || ''}</small>
                        </td>
                        <td>{renderStatusBadge(appt.status)}</td>
                        <td className="text-end pe-3 fw-bold text-dark">
                          {formatCurrency(appt.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {appointments.length === 0 && (
                  <div className="text-center py-5 border rounded bg-light mt-2">
                    <CalendarX className="text-muted mb-2" size={32} />
                    <p className="text-muted mb-0">Este cliente no tiene turnos previos.</p>
                  </div>
                )}
              </div>
            </Tab>

            {/* --- PESTAÑA 2: HISTORIA CLÍNICA (Solo Salud/Belleza) --- */}
            {sector.features?.clinicalHistory && (
              <Tab eventKey="clinical" title={<span><FileText className="me-2" /> Notas / Evolución</span>}>

                {/* Formulario Nueva Nota */}
                <div className="bg-light p-3 rounded mb-4 border">
                  <Form onSubmit={handleAddNote}>
                    <Form.Group className="mb-2">
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Escribir nueva nota o evolución..."
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        style={{ resize: 'none' }}
                      />
                    </Form.Group>
                    <div className="d-flex justify-content-end">
                      <Button size="sm" type="submit" variant="primary" disabled={!newNote.trim()}>
                        <Plus className="me-1" /> Agregar Nota
                      </Button>
                    </div>
                  </Form>
                </div>

                {/* Timeline de Notas */}
                <div className="timeline" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                  {notes.map(note => (
                    <Card key={note.id} className="mb-3 border-0 shadow-sm animate__animated animate__fadeIn">
                      <Card.Body className="p-3">

                        {/* Header de la Nota */}
                        <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2">
                          <div>
                            <span className="fw-bold text-primary d-block" style={{ fontSize: '0.9rem' }}>
                              {formatDateTime(parseDate(note.createdAt))}
                            </span>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                              Por: {note.createdBy || 'Sistema'}
                            </small>
                          </div>

                          {/* Botones (Solo visibles si no se edita) */}
                          {editingId !== note.id && (
                            <div className="d-flex gap-1">
                              <Button variant="link" className="text-secondary p-1" size="sm" onClick={() => startEditing(note)} title="Editar">
                                <PencilSquare />
                              </Button>
                              <Button variant="link" className="text-danger p-1" size="sm" onClick={() => handleDeleteNote(note.id)} title="Eliminar">
                                <Trash />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Contenido (Lectura o Edición) */}
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
                              <Button size="sm" variant="outline-secondary" onClick={cancelEditing}>
                                <XLg /> Cancelar
                              </Button>
                              <Button size="sm" variant="success" onClick={() => saveEdit(note.id)}>
                                <CheckLg /> Guardar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            {note.text}
                          </p>
                        )}
                      </Card.Body>
                    </Card>
                  ))}

                  {notes.length === 0 && (
                    <div className="text-center py-5 border rounded bg-light border-dashed">
                      <JournalX className="text-muted mb-2" size={32} />
                      <p className="text-muted mb-0">No hay notas registradas.</p>
                      <small className="text-muted">Agrega la primera evolución usando el formulario de arriba.</small>
                    </div>
                  )}
                </div>
              </Tab>
            )}
          </Tabs>
        )}
      </Modal.Body>
    </Modal>
  );
}