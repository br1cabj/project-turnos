import React, { useState, useEffect, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import { Card, Row, Col, Button, Badge } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import Swal from "sweetalert2";
import { useSector } from '../hooks/useSector';
import { Share, Link45deg, PlusCircle, CalendarPlus } from "react-bootstrap-icons";

// Componentes
import { RevenueChart, AppointmentsChart } from "../components/DashboardCharts";
import AgendaCalendar from "../components/AgendaCalendar";
import NewAppointmentModal from '../components/NewAppointmentModal';
import AppointmentDetailsModal from "../components/AppointmentDetailsModal";

// Servicios
import { getMyBusiness, subscribeToAppointments, getCollection, updateDocument } from '../services/dbService';

export default function Dashboard() {
  const { currentUser } = useAuth();

  // Estados UI
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Estado para cuando hacen click en un slot
  const [preSelectedSlot, setPreSelectedSlot] = useState(null);

  // Estados de Datos
  const [tenant, setTenant] = useState(null);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);

  // Hook de Sector
  const sector = useSector(tenant);

  // 1. CARGAR NEGOCIO
  useEffect(() => {
    async function loadBusiness() {
      if (currentUser) {
        const myBusiness = await getMyBusiness(currentUser.uid, currentUser.email);
        setTenant(myBusiness);
      }
    }
    loadBusiness();
  }, [currentUser]);

  // 2. CALCULAR HORARIOS 
  const { calendarMin, calendarMax } = useMemo(() => {
    // Valores por defecto seguros
    let minDate = new Date(); minDate.setHours(8, 0, 0);
    let maxDate = new Date(); maxDate.setHours(20, 0, 0);

    if (tenant?.openingHours) {
      let minHour = 24;
      let maxHour = 0;
      const hours = tenant.openingHours;

      // Buscamos la hora de apertura más temprana y cierre más tardía de la semana
      Object.values(hours).forEach(day => {
        if (day.isOpen) {
          const startH = parseInt(day.start.split(':')[0]);
          const endH = parseInt(day.end.split(':')[0]);
          if (startH < minHour) minHour = startH;
          if (endH > maxHour) maxHour = endH;
        }
      });

      if (minHour < 24) {
        // Le damos 1 hora de margen visual antes y después
        minDate.setHours(Math.max(0, minHour - 1), 0, 0);
        maxDate.setHours(Math.min(23, maxHour + 1), 59, 0);
      }
    }
    return { calendarMin: minDate, calendarMax: maxDate };
  }, [tenant]);

  // 3. CARGAR TURNOS Y RECURSOS
  useEffect(() => {
    if (tenant?.id) {
      // Suscripción en tiempo real a turnos
      const unsubscribe = subscribeToAppointments(tenant.id, (realEvents) => {
        // Convertimos fechas de Firestore a objetos Date de JS por seguridad
        const processedEvents = realEvents.map(evt => ({
          ...evt,
          start: evt.start instanceof Date ? evt.start : evt.start.toDate(),
          end: evt.end instanceof Date ? evt.end : evt.end.toDate(),
        }));
        setEvents(processedEvents);
      });

      // Carga única de recursos
      getCollection("resources", tenant.id).then(data => {
        const formattedResources = data.map(r => ({
          id: r.id,
          title: r.name
        }));
        setResources(formattedResources);
      });

      return () => unsubscribe();
    }
  }, [tenant]);

  // 4. CALCULAR ESTADÍSTICAS
  const { stats, chartData } = useMemo(() => {
    let computedStats = {
      projected: 0,
      collected: 0,
      pending: 0,
      totalAppointments: 0,
      occupancyRate: 0
    };
    let computedChartData = [0, 0, 0];

    if (events.length > 0 || resources.length > 0) {
      const now = new Date();
      const currentMonth = now.getMonth();

      // Filtramos turnos de ESTE mes
      const monthAppointments = events.filter(e => new Date(e.start).getMonth() === currentMonth);

      // --- LÓGICA FINANCIERA NUEVA ---
      let projected = 0;
      let collected = 0;

      monthAppointments.forEach(appt => {
        const price = Number(appt.price || 0);
        const deposit = Number(appt.deposit || 0);

        // 1. Lo proyectado es el valor total del servicio
        projected += price;

        // 2. Lo cobrado depende del estado
        // Si el estado es 'paid' o 'completed', asumimos que pagó todo (precio total)
        // Si no, solo contamos la seña (deposit) si es que existe.
        if (['paid', 'completed'].includes(appt.status)) {
          collected += price;
        } else {
          collected += deposit;
        }
      });

      const pending = projected - collected;
      // -------------------------------

      // Ocupación (Igual que antes)
      const laborDays = 22;
      const dailyHours = 9;
      const totalHoursAvailable = dailyHours * laborDays * (resources.length || 1);

      const totalHoursBooked = monthAppointments.reduce((sum, appt) => {
        const diffMs = new Date(appt.end) - new Date(appt.start);
        return sum + (diffMs / (1000 * 60 * 60));
      }, 0);

      const occupancy = totalHoursAvailable > 0
        ? Math.round((totalHoursBooked / totalHoursAvailable) * 100)
        : 0;

      // Gráficos
      const completed = monthAppointments.filter(e => ['paid', 'completed'].includes(e.status)).length;
      const pendingAppts = monthAppointments.filter(e => ['pending', 'confirmed', 'partial'].includes(e.status)).length;
      const cancelled = monthAppointments.filter(e => e.status === 'cancelled').length;

      computedChartData = [completed, pendingAppts, cancelled];

      computedStats = {
        projected,
        collected,
        pending,
        totalAppointments: monthAppointments.length,
        occupancyRate: Math.min(occupancy, 100)
      };
    }

    return { stats: computedStats, chartData: computedChartData };
  }, [events, resources]);


  // --- HANDLERS ---

  // 1. Copiar Link 
  const handleCopyLink = () => {
    if (!tenant?.slug) return;
    const url = `${window.location.origin}/reservar/${tenant.slug}`;

    navigator.clipboard.writeText(url);

    const Toast = Swal.mixin({
      toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true
    });
    Toast.fire({ icon: 'success', title: '¡Link copiado al portapapeles!' });
  };

  // 2. Click en un evento existente
  const handleEventClick = (event) => {
    setSelectedAppointment(event);
    setShowDetails(true);
  };

  // 3. Click en un hueco 
  const handleSelectSlot = ({ start, end, resourceId }) => {
    // Guardamos la info del slot y abrimos el modal
    setPreSelectedSlot({ start, end, resourceId });
    setShowModal(true);
  };

  // 4. Mover evento (Drag & Drop)
  const handleMoveEvent = async ({ event, start, end, resourceId }) => {
    try {
      const dataToUpdate = { start, end };
      if (resourceId !== undefined) {
        dataToUpdate.resourceId = resourceId;
      }

      await updateDocument("appointments", event.id, dataToUpdate);

      // Feedback sutil (Toast)
      const Toast = Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false, timer: 1500
      });
      Toast.fire({ icon: 'success', title: 'Turno actualizado' });

    } catch (error) {
      console.error('Error al mover el turno: ', error);
      Swal.fire('Error', 'No se pudo mover el turno', 'error');
    }
  };

  // 5. Redimensionar evento
  const handleResizeEvent = async ({ event, start, end }) => {
    try {
      await updateDocument("appointments", event.id, { start, end });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <MainLayout>
      {/* HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-dark mb-0">Panel de Control</h2>
          <p className="text-muted mb-0">
            {tenant ? (
              <>Hola, <span className="fw-bold text-primary">{tenant.name}</span> 👋</>
            ) : 'Cargando...'}
          </p>
        </div>

        <div className="d-flex gap-2">

          <Button
            variant="outline-primary"
            className="shadow-sm d-flex align-items-center gap-2"
            onClick={handleCopyLink}
            disabled={!tenant?.slug}
          >
            <Link45deg size={20} />
            <span className="d-none d-md-inline">Copiar Link</span>
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

      {/* KPIs */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100 position-relative overflow-hidden">
            <div className="position-absolute end-0 top-0 p-3 opacity-25">
              <span style={{ fontSize: '3rem' }}>💰</span>
            </div>
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-3 fw-bold" style={{ fontSize: "0.75rem" }}>Finanzas del Mes</h6>

              {/* Dinero Real (Grande) */}
              <div>
                <span className="text-muted small">Cobrado (Caja)</span>
                <h3 className="fw-bold text-success mb-0">
                  ${stats.collected.toLocaleString()}
                </h3>
              </div>

              <hr className="my-2 opacity-50" />

              {/* Dinero Pendiente (Pequeño) */}
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Pendiente a cobrar:</span>
                <span className="fw-bold text-dark">
                  ${stats.pending.toLocaleString()}
                </span>
              </div>

              {/* Total Proyectado (Pie de nota) */}
              <div className="mt-2 text-end">
                <small className="text-primary fw-bold" style={{ fontSize: '0.7rem' }}>
                  Total Proyectado: ${stats.projected.toLocaleString()}
                </small>
              </div>

            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100 position-relative overflow-hidden">
            <div className="position-absolute end-0 top-0 p-3 opacity-25">
              <span style={{ fontSize: '3rem' }}>📅</span>
            </div>
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: "0.8rem" }}>Turnos (Mes)</h6>
              <h3 className="fw-bold text-dark mb-0">{stats.totalAppointments}</h3>
              <small className="text-muted">
                Agendados
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100 position-relative overflow-hidden">
            <div className="position-absolute end-0 top-0 p-3 opacity-25">
              <span style={{ fontSize: '3rem' }}>📊</span>
            </div>
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: "0.8rem" }}>Ocupación</h6>
              <h3 className="fw-bold text-primary mb-0">{stats.occupancyRate}%</h3>
              <small className="text-muted">
                {stats.occupancyRate > 80 ? "🔥 Muy alta" : "🟢 Estable"}
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
                <h5 className="fw-bold text-dark m-0"><CalendarPlus className="me-2" />Agenda Semanal</h5>
                <Badge bg="light" text="dark" className="border">
                  {events.length} turnos visibles
                </Badge>
              </div>

              <div style={{ height: '600px' }}>
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
              <h5 className="fw-bold text-dark mb-4">Evolución de Ingresos</h5>
              <div style={{ height: '300px' }}>
                <RevenueChart />
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
        handleClose={() => setShowModal(false)}
        tenantId={tenant?.id}
        tenant={tenant}
        initialData={preSelectedSlot}
      />

      <AppointmentDetailsModal
        show={showDetails}
        handleClose={() => setShowDetails(false)}
        appointment={selectedAppointment}
        onUpdate={() => setShowDetails(false)}
        tenant={tenant}
      />

    </MainLayout>
  );
}