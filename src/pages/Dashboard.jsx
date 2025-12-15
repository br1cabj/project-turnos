import React, { useState, useEffect, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import { Card, Row, Col, Button, Badge, Spinner } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import Swal from "sweetalert2";
import { useSector } from '../hooks/useSector';
import { Link45deg, PlusCircle, CalendarPlus, CashCoin, CalendarCheck, BarChartLine } from "react-bootstrap-icons";

// Componentes
import { RevenueChart, AppointmentsChart } from "../components/DashboardCharts";
import AgendaCalendar from "../components/AgendaCalendar";
import NewAppointmentModal from '../components/NewAppointmentModal';
import AppointmentDetailsModal from "../components/AppointmentDetailsModal";

// Servicios
import { getMyBusiness, subscribeToAppointments, getCollection, updateDocument } from '../services/dbService';

export default function Dashboard() {
  const { currentUser } = useAuth();

  // --- ESTADOS UI ---
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [preSelectedSlot, setPreSelectedSlot] = useState(null);

  // --- ESTADOS DE DATOS ---
  const [tenant, setTenant] = useState(null);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);

  // 1. CARGAR NEGOCIO Y RECURSOS
  useEffect(() => {
    async function initDashboard() {
      if (!currentUser) return;

      try {
        setLoading(true);
        // 1. Obtener Tenant
        const myBusiness = await getMyBusiness(currentUser.uid, currentUser.email);
        setTenant(myBusiness);

        // 2. Obtener Recursos (si hay tenant)
        if (myBusiness?.id) {
          const resData = await getCollection("resources", myBusiness.id);
          setResources(resData.map(r => ({ id: r.id, title: r.name })));
        }
      } catch (error) {
        console.error("Error inicializando dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    initDashboard();
  }, [currentUser]);

  // 2. SUSCRIPCIÓN A TURNOS (Real-time)
  useEffect(() => {
    if (!tenant?.id) return;

    const unsubscribe = subscribeToAppointments(tenant.id, (realEvents) => {
      // Procesamiento seguro de fechas
      const processedEvents = realEvents.map(evt => ({
        ...evt,
        // Aseguramos que start/end sean objetos Date válidos
        start: evt.start?.toDate ? evt.start.toDate() : new Date(evt.start),
        end: evt.end?.toDate ? evt.end.toDate() : new Date(evt.end),
      }));
      setEvents(processedEvents);
    });

    return () => unsubscribe();
  }, [tenant]);

  // 3. CONFIGURACIÓN DEL CALENDARIO (Memoizado)
  const { calendarMin, calendarMax } = useMemo(() => {
    const now = new Date();
    // Creamos nuevas instancias para evitar mutaciones indeseadas
    let minDate = new Date(now.setHours(8, 0, 0, 0));
    let maxDate = new Date(now.setHours(21, 0, 0, 0));

    if (tenant?.openingHours) {
      let minHour = 24;
      let maxHour = 0;

      Object.values(tenant.openingHours).forEach(day => {
        if (day.isOpen && day.start && day.end) {
          const startH = parseInt(day.start.split(':')[0], 10);
          const endH = parseInt(day.end.split(':')[0], 10);
          if (!isNaN(startH) && startH < minHour) minHour = startH;
          if (!isNaN(endH) && endH > maxHour) maxHour = endH;
        }
      });

      if (minHour < 24) {
        // Ajustamos las fechas base con las horas encontradas
        minDate = new Date();
        minDate.setHours(Math.max(0, minHour - 1), 0, 0); // -1 hora de margen

        maxDate = new Date();
        maxDate.setHours(Math.min(23, maxHour + 1), 59, 0); // +1 hora de margen
      }
    }
    return { calendarMin: minDate, calendarMax: maxDate };
  }, [tenant]);

  // 4. CÁLCULO DE ESTADÍSTICAS Y GRÁFICOS (Memoizado)
  const { stats, chartData, revenueHistory } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // -- INIT VARIABLES --
    let projected = 0, collected = 0;
    const monthlyStats = Array(6).fill(0); // Para guardar los últimos 6 meses

    // Filtramos eventos válidos
    const activeEvents = events.filter(e => e.status !== 'cancelled');

    // -- PROCESAR TURNOS --
    activeEvents.forEach(appt => {
      const apptDate = new Date(appt.start);
      const price = Number(appt.price || 0);
      const deposit = Number(appt.deposit || 0);

      // 1. ESTADÍSTICAS DEL MES ACTUAL
      if (apptDate.getMonth() === currentMonth && apptDate.getFullYear() === currentYear) {
        projected += price;
        if (['paid', 'completed'].includes(appt.status)) {
          collected += price;
        } else {
          collected += deposit;
        }
      }

      // 2. HISTORIAL DE INGRESOS (Últimos 6 meses)
      // Calculamos la diferencia en meses respecto a hoy
      const monthDiff = (now.getFullYear() - apptDate.getFullYear()) * 12 + (now.getMonth() - apptDate.getMonth());

      // Si el turno es de los últimos 6 meses (0 a 5)
      if (monthDiff >= 0 && monthDiff < 6) {
        // Sumamos al mes correspondiente (invertimos el índice para que 0 sea el más antiguo en el gráfico si se desea, o al revés)
        // Aquí sumaremos al índice monthDiff (0 es este mes, 1 el anterior...)
        monthlyStats[monthDiff] += price;
      }
    });

    // -- ESTADO DE TURNOS (Gráfico Torta) --
    const thisMonthEvents = events.filter(e => new Date(e.start).getMonth() === currentMonth);
    const completed = thisMonthEvents.filter(e => ['paid', 'completed'].includes(e.status)).length;
    const pendingAppts = thisMonthEvents.filter(e => ['pending', 'confirmed', 'partial'].includes(e.status)).length;
    const cancelled = thisMonthEvents.filter(e => e.status === 'cancelled').length;

    // -- OCUPACIÓN --
    const laborDays = 24; // Promedio
    const dailyHours = 9;
    const totalHoursAvailable = dailyHours * laborDays * (resources.length || 1);
    const totalHoursBooked = thisMonthEvents.reduce((sum, appt) => {
      const diffMs = new Date(appt.end) - new Date(appt.start);
      return sum + (diffMs / (1000 * 60 * 60));
    }, 0);

    const occupancy = totalHoursAvailable > 0
      ? Math.round((totalHoursBooked / totalHoursAvailable) * 100)
      : 0;

    return {
      stats: {
        projected,
        collected,
        pending: projected - collected,
        totalAppointments: thisMonthEvents.length,
        occupancyRate: Math.min(occupancy, 100)
      },
      chartData: [completed, pendingAppts, cancelled],
      // Invertimos para que el gráfico muestre de izquierda (antiguo) a derecha (actual)
      revenueHistory: monthlyStats.reverse()
    };
  }, [events, resources]);

  // --- HANDLERS ---

  const handleCopyLink = () => {
    if (!tenant?.slug) return;
    const url = `${window.location.origin}/reservar/${tenant.slug}`;
    navigator.clipboard.writeText(url);
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    Toast.fire({ icon: 'success', title: 'Link copiado' });
  };

  const handleEventClick = (event) => {
    setSelectedAppointment(event);
    setShowDetails(true);
  };

  const handleSelectSlot = ({ start, end, resourceId }) => {
    setPreSelectedSlot({ start, end, resourceId });
    setShowModal(true);
  };

  // Drag & Drop
  const handleMoveEvent = async ({ event, start, end, resourceId }) => {
    try {
      const dataToUpdate = { start, end };
      if (resourceId) dataToUpdate.resourceId = resourceId;

      await updateDocument("appointments", event.id, dataToUpdate);

      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
      Toast.fire({ icon: 'success', title: 'Turno movido' });
    } catch (error) {
      console.error('Error mover:', error);
      Swal.fire('Error', 'No se pudo mover el turno', 'error');
    }
  };

  const handleResizeEvent = async ({ event, start, end }) => {
    try {
      await updateDocument("appointments", event.id, { start, end });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPreSelectedSlot(null); // Limpiamos selección al cerrar
  };

  // --- RENDER ---

  if (loading) {
    return (
      <MainLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 animate__animated animate__fadeIn">
        <div>
          <h2 className="fw-bold text-dark mb-0">Panel de Control</h2>
          <p className="text-muted mb-0">
            {tenant ? (
              <>Bienvenido, <span className="fw-bold text-primary">{tenant.name}</span></>
            ) : 'Gestión de Turnos'}
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            className="shadow-sm d-flex align-items-center gap-2 bg-white"
            onClick={handleCopyLink}
            disabled={!tenant?.slug}
          >
            <Link45deg size={20} />
            <span className="d-none d-md-inline">Link Reserva</span>
          </Button>

          <Button
            variant="primary"
            className="shadow-sm d-flex align-items-center gap-2"
            onClick={() => { setPreSelectedSlot(null); setShowModal(true); }}
          >
            <PlusCircle size={20} />
            <span>Nuevo Turno</span>
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <Row className="mb-4 g-3">
        {/* Card Finanzas */}
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100 position-relative overflow-hidden card-hover">
            <div className="position-absolute end-0 top-0 p-3 opacity-10 text-success">
              <CashCoin size={48} />
            </div>
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-3 fw-bold small">Finanzas (Mes)</h6>
              <div>
                <span className="text-muted small">Cobrado</span>
                <h3 className="fw-bold text-dark mb-0">${stats.collected.toLocaleString()}</h3>
              </div>
              <hr className="my-2 opacity-25" />
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Pendiente:</span>
                <span className="fw-bold text-danger">${stats.pending.toLocaleString()}</span>
              </div>
              <div className="mt-2 text-end">
                <small className="text-primary fw-bold" style={{ fontSize: '0.75rem' }}>
                  Proyectado: ${stats.projected.toLocaleString()}
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Card Cantidad Turnos */}
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100 position-relative overflow-hidden card-hover">
            <div className="position-absolute end-0 top-0 p-3 opacity-10 text-primary">
              <CalendarCheck size={48} />
            </div>
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2 small fw-bold">Turnos Agendados</h6>
              <h3 className="fw-bold text-dark mb-0">{stats.totalAppointments}</h3>
              <small className="text-muted">En el mes actual</small>
            </Card.Body>
          </Card>
        </Col>

        {/* Card Ocupación */}
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100 position-relative overflow-hidden card-hover">
            <div className="position-absolute end-0 top-0 p-3 opacity-10 text-info">
              <BarChartLine size={48} />
            </div>
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2 small fw-bold">Tasa de Ocupación</h6>
              <h3 className={`fw-bold mb-0 ${stats.occupancyRate > 80 ? 'text-success' : 'text-primary'}`}>
                {stats.occupancyRate}%
              </h3>
              <small className="text-muted">
                {stats.occupancyRate > 80 ? "🔥 Alta demanda" : "🟢 Capacidad disponible"}
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* CALENDARIO */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0 p-md-3">
              <div className="d-flex justify-content-between align-items-center mb-3 px-3 pt-3 px-md-0 pt-md-0">
                <h5 className="fw-bold text-dark m-0 d-flex align-items-center">
                  <CalendarPlus className="me-2 text-primary" /> Agenda
                </h5>
                <Badge bg="light" text="dark" className="border">
                  {events.length} turnos cargados
                </Badge>
              </div>

              {/* Altura dinámica para móvil vs desktop */}
              <div style={{ height: '75vh', minHeight: '500px' }}>
                <AgendaCalendar
                  events={events}
                  resources={resources}
                  onSelectEvent={handleEventClick}
                  onSelectSlot={handleSelectSlot}
                  onMoveEvent={handleMoveEvent}
                  onResizeEvent={handleResizeEvent}
                  minTime={calendarMin}
                  maxTime={calendarMax}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* GRÁFICOS */}
      <Row className="mb-4">
        <Col lg={8} className="mb-3 mb-lg-0">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <h5 className="fw-bold text-dark mb-4">Ingresos (Últimos 6 meses)</h5>
              <div style={{ height: '300px' }}>
                {/* Pasamos los datos calculados al gráfico */}
                <RevenueChart data={revenueHistory} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <h5 className="fw-bold text-dark mb-4">Estado de Turnos</h5>
              <div style={{ height: '300px' }}>
                <AppointmentsChart data={chartData} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* MODALES */}
      <NewAppointmentModal
        show={showModal}
        handleClose={handleCloseModal}
        tenantId={tenant?.id}
        tenant={tenant}
        initialData={preSelectedSlot} // Pasamos el slot seleccionado
      />

      <AppointmentDetailsModal
        show={showDetails}
        handleClose={() => setShowDetails(false)}
        appointment={selectedAppointment}
        onUpdate={() => setShowDetails(false)}
        tenant={tenant}
      />

      {/* Estilos extra para hover effect en las cards */}
      <style>{`
        .card-hover { transition: transform 0.2s; }
        .card-hover:hover { transform: translateY(-5px); }
      `}</style>

    </MainLayout>
  );
}