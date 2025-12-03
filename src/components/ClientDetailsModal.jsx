import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Tab, Table, Form, Card, Badge } from 'react-bootstrap';
import { FileText, ClockHistory, Plus } from 'react-bootstrap-icons';
import { getClientHistory, getClinicalNotes, addClinicalNote } from '../services/dbService';
import { useSector } from '../hooks/useSector';
import Swal from 'sweetalert2';

export default function ClientDetailsModal({ show, handleClose, client, tenant }) {
  const [activeTab, setActiveTab] = useState('history');
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  const sector = useSector(tenant);


  useEffect(() => {
    const loadData = async () => {
      if (!client || !tenant?.id) return;

      setLoading(true);
      try {
        // Cargar Historial
        const appts = await getClientHistory(tenant.id, client.name);
        setAppointments(appts);

        // Cargar Notas Clínicas 
        if (sector.features?.clinicalHistory) {
          const clinicalData = await getClinicalNotes(tenant.id, client.id);
          setNotes(clinicalData);
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

  // 2. AGREGAR NOTA
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await addClinicalNote(tenant.id, client.id, newNote);
      setNewNote("");


      const updatedNotes = await getClinicalNotes(tenant.id, client.id);
      setNotes(updatedNotes);

      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      Toast.fire({ icon: 'success', title: 'Nota agregada' });

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo guardar la nota', 'error');
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
                      <td>
                        {appt.start?.seconds
                          ? new Date(appt.start.seconds * 1000).toLocaleDateString()
                          : new Date(appt.start).toLocaleDateString()
                        }
                      </td>
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
                    <Button size="sm" type="submit" variant="primary">
                      <Plus className="me-1" /> Agregar Nota
                    </Button>
                  </div>
                </Form>
              </div>

              <div className="timeline" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {notes.map(note => (
                  <Card key={note.id} className="mb-2 border-0 shadow-sm">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between text-muted small mb-2 border-bottom pb-1">
                        <span>{note.createdAt ? new Date(note.createdAt).toLocaleString() : "-"}</span>
                        <span>{note.createdBy}</span>
                      </div>
                      <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>{note.text}</p>
                    </Card.Body>
                  </Card>
                ))}
                {notes.length === 0 && !loading && (
                  <p className="text-center text-muted py-3">No hay notas clínicas aún.</p>
                )}
              </div>
            </Tab>
          )}

        </Tabs>
      </Modal.Body>
    </Modal>
  );
}