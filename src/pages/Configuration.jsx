import React, { useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { Tabs, Tab, Button, Card, Table, Row, Col, Spinner, Form } from "react-bootstrap";
import { Briefcase, PersonBadge, Clock, Palette, PlusCircle, Pencil, Trash } from "react-bootstrap-icons";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSector } from "../hooks/useSector";
import { useConfigurationData } from "../hooks/useConfigurationData";
import { THEMES } from "../config/themes";

// Sub-componentes
import IdentityCard from '../components/configuration/IdentityCard';
import ConfigModal from '../components/configuration/ConfigModal';

// Helpers visuales simples
const TIME_SLOTS = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function Configuration() {
  const { currentUser } = useAuth();
  const { refreshTheme } = useTheme();

  // 1. Hook Principal
  const {
    tenant, services, resources, schedule, loading, processing,
    handleLogoUpload, handleSaveTheme, handleSaveSchedule, handleDeleteItem, handleUpsertItem, setSchedule
  } = useConfigurationData(currentUser, refreshTheme);

  // 2. Hook de UI 
  const sector = useSector(tenant);

  // 3. Estado Local UI 
  const [modalConfig, setModalConfig] = useState({ show: false, type: '', item: null });
  const [selectedTheme, setSelectedTheme] = useState('dark');

  // --- Handlers UI ---
  const openModal = (type, item = null) => setModalConfig({ show: true, type, item });
  const closeModal = () => setModalConfig({ show: false, type: '', item: null });

  const handleDayChange = (dayIdx, field, val) => {
    setSchedule(prev => ({ ...prev, [dayIdx]: { ...prev[dayIdx], [field]: val } }));
  };

  if (loading) return <MainLayout><div className="text-center p-5"><Spinner animation="border" /></div></MainLayout>;

  return (
    <MainLayout>
      <div className="mb-4">
        <h2 className="fw-bold text-dark">Configuración</h2>
        <p className="text-muted">Administra los detalles de tu negocio</p>
      </div>

      <IdentityCard tenant={tenant} onUpload={handleLogoUpload} processing={processing} />

      <Tabs defaultActiveKey="appearance" className="mb-4 custom-tabs border-bottom-0">

        {/* --- TEMA --- */}
        <Tab eventKey="appearance" title={<span><Palette className="me-2" /> Apariencia</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="m-0 fw-bold text-primary">Tema Visual</h6>
              <Button onClick={() => handleSaveTheme(selectedTheme)} disabled={processing}>{processing ? <Spinner size="sm" /> : "Aplicar"}</Button>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                {Object.values(THEMES).map(t => (
                  <Col key={t.id} xs={6} md={4}>
                    <div
                      className={`border p-3 rounded cursor-pointer ${selectedTheme === t.id ? 'border-primary bg-light' : ''}`}
                      onClick={() => setSelectedTheme(t.id)}
                    >
                      <strong>{t.name}</strong>
                      <div className="d-flex mt-2" style={{ height: 40 }}>
                        <div style={{ width: '30%', background: t.sidebarBg }}></div>
                        <div style={{ width: '70%', background: t.mainBg }}></div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        {/* --- SERVICIOS --- */}
        <Tab eventKey="services" title={<span><Briefcase className="me-2" /> {sector.serviceLabel}s</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between">
              <h6 className="m-0 fw-bold text-primary">Listado</h6>
              <Button size="sm" onClick={() => openModal('services')}><PlusCircle className="me-1" /> Nuevo</Button>
            </Card.Header>
            <Table hover responsive className="mb-0 align-middle">
              <thead className="bg-light"><tr><th className="ps-4">Nombre</th><th>Duración</th><th>Precio</th><th className="text-end pe-4">Acciones</th></tr></thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id}>
                    <td className="ps-4 fw-bold">{s.name}</td>
                    <td>{s.duration} min</td>
                    <td>${s.price}</td>
                    <td className="text-end pe-4">
                      <Button variant="link" size="sm" onClick={() => openModal('services', s)}><Pencil /></Button>
                      <Button variant="link" size="sm" className="text-danger" onClick={() => handleDeleteItem('services', s.id)}><Trash /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Tab>

        {/* --- EQUIPO --- */}
        <Tab eventKey="team" title={<span><PersonBadge className="me-2" /> {sector.resourceLabel}s</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between">
              <h6 className="m-0 fw-bold text-primary">Equipo</h6>
              <Button variant="success" size="sm" onClick={() => openModal('resources')}><PlusCircle className="me-1" /> Nuevo</Button>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                {resources.map(r => (
                  <Col key={r.id} md={4}>
                    <Card className="h-100 shadow-sm border">
                      <Card.Body className="d-flex align-items-center gap-3">
                        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
                          {r.photoUrl ? <img src={r.photoUrl} className="rounded-circle w-100 h-100 object-fit-cover" /> : <PersonBadge />}
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-0 fw-bold">{r.name}</h6>
                          <small className="text-muted">{r.description || "-"}</small>
                        </div>
                        <div>
                          <Button variant="outline-primary" size="sm" className="me-1" onClick={() => openModal('resources', r)}><Pencil size={12} /></Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDeleteItem('resources', r.id)}><Trash size={12} /></Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        {/* --- HORARIOS --- */}
        <Tab eventKey="hours" title={<span><Clock className="me-2" /> Horarios</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between">
              <h6 className="m-0 fw-bold text-primary">Disponibilidad Semanal</h6>
              <Button onClick={() => handleSaveSchedule(schedule)} disabled={processing}>{processing ? <Spinner size="sm" /> : "Guardar"}</Button>
            </Card.Header>
            <Card.Body>
              {DAYS.map((day, idx) => {
                const config = schedule[idx] || { isOpen: false, start: '09:00', end: '19:00' };
                return (
                  <Row key={idx} className="align-items-center py-2 border-bottom">
                    <Col xs={4}><strong>{day}</strong></Col>
                    <Col xs={8} className="d-flex align-items-center gap-2">
                      <Form.Check type="switch" checked={config.isOpen} onChange={e => handleDayChange(idx, 'isOpen', e.target.checked)} />
                      {config.isOpen ? (
                        <>
                          <Form.Select size="sm" value={config.start} onChange={e => handleDayChange(idx, 'start', e.target.value)}>{TIME_SLOTS.map(t => <option key={t}>{t}</option>)}</Form.Select>
                          <span>-</span>
                          <Form.Select size="sm" value={config.end} onChange={e => handleDayChange(idx, 'end', e.target.value)}>{TIME_SLOTS.map(t => <option key={t}>{t}</option>)}</Form.Select>
                        </>
                      ) : <span className="text-muted small">Cerrado</span>}
                    </Col>
                  </Row>
                );
              })}
            </Card.Body>
          </Card>
        </Tab>

      </Tabs>

      {/* --- MODALS --- */}
      <ConfigModal
        show={modalConfig.show}
        onHide={closeModal}
        type={modalConfig.type}
        itemToEdit={modalConfig.item}
        onSave={handleUpsertItem}
        processing={processing}
        labels={{ service: sector.serviceLabel, resource: sector.resourceLabel }}
      />
    </MainLayout>
  );
}