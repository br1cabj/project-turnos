import React, { useState, useEffect, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import { Card, Row, Col, Button } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import Swal from "sweetalert2";
import { useSector } from '../hooks/useSector';

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
    let minDate = new Date(0, 0, 0, 8, 0, 0);
    let maxDate = new Date(0, 0, 0, 22, 0, 0);

    if (tenant?.openingHours) {
      let minHour = 24;
      let maxHour = 0;
      const hours = tenant.openingHours;

      Object.values(hours).forEach(day => {
        if (day.isOpen) {
          const startH = parseInt(day.start.split(':')[0]);
          const endH = parseInt(day.end.split(':')[0]);
          if (startH < minHour) minHour = startH;
          if (endH > maxHour) maxHour = endH;
        }
      });

      if (minHour < 24) {
        minDate = new Date(0, 0, 0, Math.max(0, minHour - 1), 0, 0);
        maxDate = new Date(0, 0, 0, Math.min(23, maxHour + 1), 59, 0);
      }
    }
    return { calendarMin: minDate, calendarMax: maxDate };
  }, [tenant]);

  // 3. CARGAR TURNOS Y RECURSOS
  useEffect(() => {
    if (tenant?.id) {
      const unsubscribe = subscribeToAppointments(tenant.id, (realEvents) => {
        setEvents(realEvents);
      });

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

  // 4. CALCULAR ESTADÍSTICAS Y GRÁFICOS
  const { stats, chartData } = useMemo(() => {
    let computedStats = { income: 0, totalAppointments: 0, occupancyRate: 0, growth: 0 };
    let computedChartData = [0, 0, 0];

    if (events.length > 0 || resources.length > 0) {
      const now = new Date();
      const currentMonth = now.getMonth();

      // Ingresos
      const monthAppointments = events.filter(e => new Date(e.start).getMonth() === currentMonth);
      const totalIncome = monthAppointments.reduce((sum, appt) => sum + Number(appt.price || 0), 0);

      // Ocupación
      const totalHoursAvailable = 10 * 30 * (resources.length || 1);
      const totalHoursBooked = monthAppointments.reduce((sum, appt) => {
        const diffMs = new Date(appt.end) - new Date(appt.start);
        return sum + (diffMs / (1000 * 60 * 60));
      }, 0);

      const occupancy = totalHoursAvailable > 0
        ? Math.round((totalHoursBooked / totalHoursAvailable) * 100)
        : 0;

      // Gráficos
      const completed = events.filter(e => e.status === 'paid' || e.status === 'completed').length;
      const pending = events.filter(e => e.status === 'pending' || !e.status).length;
      const cancelled = events.filter(e => e.status === 'cancelled').length;

      computedChartData = [completed, pending, cancelled];

      computedStats = {
        income: totalIncome,
        totalAppointments: monthAppointments.length,
        occupancyRate: occupancy,
        growth: 0
      };
    }

    return { stats: computedStats, chartData: computedChartData };
  }, [events, resources]);
  // HANDLERS
  const handleEventClick = (event) => {
    setSelectedAppointment(event);
    setShowDetails(true);
  };

  const handleMoveEvent = async ({ event, start, end, resourceId }) => {
    try {
      const dataToUpdate = { start, end };
      if (resourceId !== undefined) {
        dataToUpdate.resourceId = resourceId;
      }
      await updateDocument("appointments", event.id, dataToUpdate);
      console.log("Turno movido correctamente");
    } catch (error) {
      console.error('Error al mover el turno: ', error);
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

  return (
    <MainLayout>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark">Agenda</h2>
          <p className="text-muted">
            {tenant ? tenant.name : 'Cargando negocio...'}
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            className="shadow-sm"
            onClick={() => setShowModal(true)}
          >
            + {sector.actionLabel}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: "0.8rem" }}>Ingresos del Mes (Estimado)</h6>
              <h3 className="fw-bold text-dark">
                ${stats.income.toLocaleString()}
              </h3>
              <span className="text-success small fw-bold">
                Base: {events.length} turnos
              </span>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: "0.8rem" }}>Turnos este Mes</h6>
              <h3 className="fw-bold text-dark">{stats.totalAppointments}</h3>
              <span className="text-muted small fw-bold">
                En agenda
              </span>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h6 className="text-muted text-uppercase mb-2" style={{ fontSize: "0.8rem" }}>Tasa de Ocupación</h6>
              <h3 className="fw-bold text-primary">{stats.occupancyRate}%</h3>
              <span className="text-muted small">
                {stats.occupancyRate > 80 ? "🔥 Capacidad casi llena" : "🟢 Espacio disponible"}
              </span>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* CALENDARIO */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="fw-bold text-dark mb-3">Agenda Semanal</h5>
              <AgendaCalendar
                events={events}
                resources={resources}
                onSelectEvent={handleEventClick}
                onMoveEvent={handleMoveEvent}
                onResizeEvent={handleResizeEvent}
                minTime={calendarMin}
                maxTime={calendarMax}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* GRÁFICOS */}
      <Row className="mb-4">
        <Col lg={8} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <h5 className="fw-bold text-dark mb-4">Evolución de Ingresos</h5>
              <RevenueChart />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <h5 className="fw-bold text-dark mb-4">Estado de Turnos</h5>
              {/* Ahora chartData existe y es válida */}
              <AppointmentsChart data={chartData} />
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