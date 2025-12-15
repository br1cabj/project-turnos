import React, { useState, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import { Tabs, Tab, Button, Card, Table, Row, Col, Spinner, Badge, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Briefcase, PersonBadge, Clock, Palette, PlusCircle, Pencil, Trash, CheckCircleFill, InfoCircle } from "react-bootstrap-icons";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSector } from "../hooks/useSector";
import { useConfigurationData } from "../hooks/useConfigurationData";
import { THEMES } from "../config/themes";

// Sub-componentes
import IdentityCard from '../components/configuration/IdentityCard';
import ConfigModal from '../components/configuration/ConfigModal';

// --- CONSTANTES ---
const TIME_SLOTS = Array.from({ length: 24 * 2 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// --- COMPONENTE FILA DE HORARIO (Optimizado) ---
const ScheduleRow = React.memo(({ dayName, dayIndex, config, onChange }) => {
  const isOpen = config?.isOpen || false;
  const start = config?.start || '09:00';
  const end = config?.end || '18:00';

  return (
    <Row className="align-items-center py-3 border-bottom hover-bg-light transition-all">
      <Col xs={4} md={3}>
        <span className={`fw-bold ${isOpen ? 'text-dark' : 'text-muted'}`}>{dayName}</span>
      </Col>
      <Col xs={8} md={9} className="d-flex align-items-center gap-3">
        <Form.Check
          type="switch"
          id={`switch-${dayIndex}`}
          checked={isOpen}
          onChange={e => onChange(dayIndex, 'isOpen', e.target.checked)}
          className="custom-switch"
        />

        {isOpen ? (
          <div className="d-flex align-items-center gap-2 animate__animated animate__fadeIn">
            <Form.Select
              size="sm"
              value={start}
              onChange={e => onChange(dayIndex, 'start', e.target.value)}
              style={{ width: '90px', borderColor: '#e9ecef' }}
            >
              {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
            </Form.Select>
            <span className="text-muted small">a</span>
            <Form.Select
              size="sm"
              value={end}
              onChange={e => onChange(dayIndex, 'end', e.target.value)}
              style={{ width: '90px', borderColor: '#e9ecef' }}
            >
              {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
            </Form.Select>
          </div>
        ) : (
          <Badge bg="light" text="muted" className="border fw-normal">Cerrado</Badge>
        )}
      </Col>
    </Row>
  );
});

// --- COMPONENTE PRINCIPAL ---
export default function Configuration() {
  const { currentUser } = useAuth();
  const { refreshTheme } = useTheme();

  // 1. Hook de Datos
  const {
    tenant, services, resources, schedule, loading, processing,
    handleLogoUpload, handleSaveTheme, handleSaveSchedule, handleDeleteItem, handleUpsertItem, setSchedule
  } = useConfigurationData(currentUser, refreshTheme);

  // 2. UI Helpers
  const sector = useSector(tenant);
  const [modalConfig, setModalConfig] = useState({ show: false, type: '', item: null });
  const [selectedTheme, setSelectedTheme] = useState('dark');

  // --- Handlers ---
  const openModal = (type, item = null) => setModalConfig({ show: true, type, item });
  const closeModal = () => setModalConfig({ show: false, type: '', item: null });

  const handleDayChange = (dayIdx, field, val) => {
    setSchedule(prev => ({
      ...prev,
      [dayIdx]: { ...prev[dayIdx], [field]: val }
    }));
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="d-flex flex-column justify-content-center align-items-center vh-50">
          <Spinner animation="border" variant="primary" role="status" />
          <span className="mt-3 text-muted">Cargando configuración...</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-end mb-4 animate__animated animate__fadeIn">
        <div>
          <h2 className="fw-bold text-dark mb-0">Configuración</h2>
          <p className="text-muted mb-0">Personaliza tu negocio y administra tus recursos</p>
        </div>
      </div>

      <div className="animate__animated animate__fadeInUp">
        <IdentityCard tenant={tenant} onUpload={handleLogoUpload} processing={processing} />
      </div>

      <Tabs defaultActiveKey="appearance" className="mb-4 custom-tabs border-bottom-0 mt-4 nav-pills-custom">

        {/* --- TEMA --- */}
        <Tab eventKey="appearance" title={<span><Palette className="me-2" /> Apariencia</span>}>
          <Card className="border-0 shadow-sm overflow-hidden">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <h6 className="m-0 fw-bold text-dark">Tema Visual</h6>
                <small className="text-muted">Elige los colores de tu panel administrativo</small>
              </div>
              <Button
                variant="primary"
                onClick={() => handleSaveTheme(selectedTheme)}
                disabled={processing}
                className="px-4"
              >
                {processing ? <Spinner size="sm" animation="border" /> : "Guardar Cambios"}
              </Button>
            </Card.Header>
            <Card.Body className="bg-light">
              <Row className="g-4">
                {Object.values(THEMES).map(t => (
                  <Col key={t.id} xs={12} sm={6} md={4} lg={3}>
                    <div
                      className={`position-relative cursor-pointer transition-all ${selectedTheme === t.id ? 'transform-scale' : ''}`}
                      onClick={() => setSelectedTheme(t.id)}
                    >
                      <div className={`card h-100 overflow-hidden ${selectedTheme === t.id ? 'ring-2 ring-primary shadow' : 'border shadow-sm'}`}>
                        {/* Preview Mockup */}
                        <div className="d-flex" style={{ height: '100px' }}>
                          <div style={{ width: '25%', background: t.sidebarBg }} className="d-flex flex-column align-items-center pt-2">
                            <div className="bg-white opacity-25 rounded-circle mb-1" style={{ width: 8, height: 8 }}></div>
                            <div className="bg-white opacity-25 rounded w-50" style={{ height: 4 }}></div>
                          </div>
                          <div style={{ width: '75%', background: t.mainBg }} className="p-2">
                            <div className="bg-white shadow-sm rounded mb-2" style={{ height: 20, width: '100%' }}></div>
                            <div className="d-flex gap-1">
                              <div className="bg-white shadow-sm rounded" style={{ height: 40, width: '60%' }}></div>
                              <div className="bg-white shadow-sm rounded" style={{ height: 40, width: '35%' }}></div>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-white d-flex justify-content-between align-items-center">
                          <span className="fw-bold text-dark small">{t.name}</span>
                          {selectedTheme === t.id && <CheckCircleFill className="text-primary" />}
                        </div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        {/* --- SERVICIOS --- */}
        <Tab eventKey="services" title={<span><Briefcase className="me-2" /> {sector.serviceLabel || "Servicios"}</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="m-0 fw-bold text-dark">Catálogo de {sector.serviceLabel || "Servicios"}</h6>
                <small className="text-muted">Gestiona lo que ofreces a tus clientes</small>
              </div>
              <Button variant="primary" size="sm" onClick={() => openModal('services')}>
                <PlusCircle className="me-2" /> Nuevo
              </Button>
            </Card.Header>

            {services.length === 0 ? (
              <div className="text-center py-5">
                <div className="text-muted opacity-50 mb-3"><Briefcase size={40} /></div>
                <h5>No hay servicios registrados</h5>
                <p className="text-muted small">Comienza agregando tu primer servicio.</p>
                <Button variant="outline-primary" size="sm" onClick={() => openModal('services')}>Crear Servicio</Button>
              </div>
            ) : (
              <Table hover responsive className="mb-0 align-middle">
                <thead className="bg-light text-muted small text-uppercase">
                  <tr>
                    <th className="ps-4 border-0">Nombre</th>
                    <th className="border-0">Duración</th>
                    <th className="border-0">Precio</th>
                    <th className="text-end pe-4 border-0">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id}>
                      <td className="ps-4 fw-bold text-dark">{s.name}</td>
                      <td><Badge bg="light" text="dark" className="border"><Clock className="me-1" />{s.duration} min</Badge></td>
                      <td className="fw-bold text-success">${s.price}</td>
                      <td className="text-end pe-4">
                        <OverlayTrigger overlay={<Tooltip>Editar</Tooltip>}>
                          <Button variant="link" className="text-secondary p-1" onClick={() => openModal('services', s)}><Pencil /></Button>
                        </OverlayTrigger>
                        <OverlayTrigger overlay={<Tooltip>Eliminar</Tooltip>}>
                          <Button variant="link" className="text-danger p-1" onClick={() => handleDeleteItem('services', s.id)}><Trash /></Button>
                        </OverlayTrigger>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </Tab>

        {/* --- EQUIPO / RECURSOS --- */}
        <Tab eventKey="team" title={<span><PersonBadge className="me-2" /> {sector.resourceLabel || "Equipo"}</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="m-0 fw-bold text-dark">Gestión de {sector.resourceLabel || "Equipo"}</h6>
                <small className="text-muted">Profesionales o recursos disponibles</small>
              </div>
              <Button variant="success" size="sm" onClick={() => openModal('resources')}>
                <PlusCircle className="me-2" /> Nuevo
              </Button>
            </Card.Header>
            <Card.Body className="bg-light">
              {resources.length === 0 ? (
                <div className="text-center py-5">
                  <div className="text-muted opacity-50 mb-3"><PersonBadge size={40} /></div>
                  <h5>Sin equipo registrado</h5>
                  <p className="text-muted small">Agrega profesionales para asignar turnos.</p>
                </div>
              ) : (
                <Row className="g-3">
                  {resources.map(r => (
                    <Col key={r.id} xs={12} md={6} lg={4}>
                      <Card className="h-100 shadow-sm border-0 position-relative resource-card">
                        <Card.Body className="d-flex align-items-center gap-3">
                          <div className="position-relative">
                            <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center overflow-hidden" style={{ width: 56, height: 56 }}>
                              {r.photoUrl ? (
                                <img src={r.photoUrl} alt={r.name} className="w-100 h-100 object-fit-cover" />
                              ) : (
                                <span className="fw-bold text-primary fs-5">{r.name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-grow-1 overflow-hidden">
                            <h6 className="mb-0 fw-bold text-truncate">{r.name}</h6>
                            <small className="text-muted d-block text-truncate" title={r.description}>
                              {r.description || "Sin descripción"}
                            </small>
                          </div>
                          <div className="d-flex flex-column gap-1">
                            <Button variant="light" size="sm" className="text-secondary" onClick={() => openModal('resources', r)}><Pencil size={14} /></Button>
                            <Button variant="light" size="sm" className="text-danger" onClick={() => handleDeleteItem('resources', r.id)}><Trash size={14} /></Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* --- HORARIOS --- */}
        <Tab eventKey="hours" title={<span><Clock className="me-2" /> Horarios</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <div>
                <h6 className="m-0 fw-bold text-dark">Disponibilidad Semanal</h6>
                <small className="text-muted">Define cuándo pueden reservar tus clientes</small>
              </div>
              <Button
                onClick={() => handleSaveSchedule(schedule)}
                disabled={processing}
                variant="primary"
              >
                {processing ? <Spinner size="sm" animation="border" /> : "Guardar Horarios"}
              </Button>
            </Card.Header>
            <Card.Body>
              <div className="alert alert-light border d-flex align-items-center mb-4">
                <InfoCircle className="text-primary me-2" />
                <small className="text-muted">Los días marcados como "Cerrado" no aparecerán disponibles en el calendario de reservas.</small>
              </div>

              <div className="ps-2 pe-2">
                {DAYS.map((day, idx) => (
                  <ScheduleRow
                    key={idx}
                    dayName={day}
                    dayIndex={idx}
                    config={schedule[idx] || {}}
                    onChange={handleDayChange}
                  />
                ))}
              </div>
            </Card.Body>
          </Card>
        </Tab>

      </Tabs>

      {/* --- MODAL --- */}
      <ConfigModal
        key={modalConfig.item ? `edit-${modalConfig.item.id}` : 'create-new'}
        show={modalConfig.show}
        onHide={closeModal}
        type={modalConfig.type}
        itemToEdit={modalConfig.item}
        onSave={handleUpsertItem}
        processing={processing}
        labels={{ service: sector.serviceLabel, resource: sector.resourceLabel }}
      />

      {/* Estilos CSS */}
      <style>{`
        .custom-tabs .nav-link { color: #6c757d; font-weight: 500; padding: 10px 20px; }
        .custom-tabs .nav-link.active { color: #0d6efd; background: transparent; border-bottom: 2px solid #0d6efd; }
        .transform-scale { transform: scale(1.02); }
        .ring-2 { box-shadow: 0 0 0 2px #0d6efd; }
        .transition-all { transition: all 0.2s ease-in-out; }
        .resource-card:hover { transform: translateY(-3px); box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important; }
        .hover-bg-light:hover { background-color: #f8f9fa; }
      `}</style>
    </MainLayout>
  );
}