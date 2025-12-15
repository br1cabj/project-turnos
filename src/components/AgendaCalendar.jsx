import React, { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';

// Estilos de la librería
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// --- CONFIGURACIÓN LOCAL ---
const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

const messages = {
  allDay: 'Todo el día',
  previous: '<',
  next: '>',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Lista',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay turnos en este rango.',
  showMore: total => `+ Ver más (${total})`
};

// --- COMPONENTE VISUAL DEL TURNO (Contenido Interno) ---
const CustomEvent = ({ event }) => {
  return (
    <div className="d-flex flex-column h-100 justify-content-center lh-1 ps-1">
      <div className="fw-bold text-truncate" style={{ fontSize: '0.85rem' }}>
        {event.title || 'Turno'}
      </div>
      <div className="text-truncate" style={{ fontSize: "0.75rem", opacity: 0.9 }}>
        {event.client ? `👤 ${event.client}` : 'Sin cliente'}
      </div>
      {event.status === 'paid' && (
        <div style={{ fontSize: "0.65rem", marginTop: '2px' }}>💰 Pagado</div>
      )}
    </div>
  );
};

const DnDCalendar = withDragAndDrop(Calendar);

const AgendaCalendar = ({
  events = [],
  resources = [],
  onSelectEvent,
  onSelectSlot,
  onMoveEvent,
  onResizeEvent,
  minTime,
  maxTime
}) => {
  const [view, setView] = useState(Views.DAY);
  const [date, setDate] = useState(new Date());

  // --- LÓGICA DE COLORES ---
  const eventStyleGetter = (event) => {
    let backgroundColor = '#3788d8';
    let borderColor = '#2c6cb0';
    let color = '#fff';

    // Personalización según estado
    switch (event.status) {
      case 'paid':
      case 'completed':
        backgroundColor = '#198754';
        borderColor = '#157347';
        break;
      case 'pending':
      case 'confirmed':
        backgroundColor = '#ffc107';
        borderColor = '#ffca2c';
        color = '#000';
        break;
      case 'cancelled':
        backgroundColor = '#dc3545';
        borderColor = '#bb2d3b';
        break;
      default:
        if (event.bgColor) backgroundColor = event.bgColor;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color,
        borderRadius: '6px',
        border: '0px',
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '2px 4px',
        fontSize: '0.8rem',
        display: 'block'
      }
    };
  };

  const formats = useMemo(() => ({
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }, culture, local) =>
      `${local.format(start, 'HH:mm', culture)} - ${local.format(end, 'HH:mm', culture)}`,
  }), []);

  // Controlar qué recursos mostrar
  const resourceToDisplay = view === Views.DAY ? resources : undefined;

  // Defaults seguros
  const defaultMin = new Date(); defaultMin.setHours(7, 0, 0);
  const defaultMax = new Date(); defaultMax.setHours(23, 0, 0);

  return (
    <div className="agenda-calendar-container bg-white rounded p-0 p-md-2 h-100">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"

        // Propiedades Visuales
        style={{ height: '100%', minHeight: '550px' }}
        culture='es'
        messages={messages}
        formats={formats}
        eventPropGetter={eventStyleGetter}
        components={{
          event: CustomEvent,
        }}

        // Interacciones
        selectable={true}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}

        // Drag and Drop
        onEventDrop={onMoveEvent}
        onEventResize={onResizeEvent}
        resizable

        // Vistas y Navegación
        view={view}
        date={date}
        onView={setView}
        onNavigate={setDate}
        defaultView={Views.DAY}
        views={[Views.DAY, Views.WEEK, Views.AGENDA]}

        // Configuración Horaria
        step={15}
        timeslots={4}
        min={minTime || defaultMin}
        max={maxTime || defaultMax}
        scrollToTime={minTime || defaultMin}

        // Recursos (Columnas)
        resources={resourceToDisplay}
        resourceIdAccessor="id"
        resourceTitleAccessor="title"
      />

      {/* --- CSS OVERRIDES --- */}
      <style>{`
        /* Tipografía y bordes generales */
        .rbc-calendar { font-family: inherit; }
        
        /* Header del calendario (Días) */
        .rbc-header {
          padding: 10px 0;
          font-weight: 600;
          font-size: 0.9rem;
          color: #495057;
          border-bottom: 2px solid #f1f3f5 !important;
          background-color: #f8f9fa;
        }

        /* Columna de horas (Izquierda) */
        .rbc-time-gutter .rbc-timeslot-group {
            border-bottom: 1px solid #f1f3f5;
        }
        .rbc-label {
            color: #adb5bd;
            font-size: 0.75rem;
            font-weight: 500;
        }

        /* Día actual (Hoy) */
        .rbc-today {
          background-color: rgba(13, 110, 253, 0.03) !important; /* Azul muy suave */
        }

        /* Líneas de la grilla */
        .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #f8f9fa; /* Más sutil */
        }
        .rbc-time-view, .rbc-month-view {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
        }

        /* Botones de navegación (Toolbar) */
        .rbc-toolbar button {
          border: 1px solid #dee2e6;
          color: #495057;
          font-size: 0.85rem;
          padding: 6px 12px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .rbc-toolbar button:hover {
          background-color: #e9ecef;
          color: #212529;
        }
        .rbc-toolbar button.rbc-active {
          background-color: #0d6efd;
          color: white;
          border-color: #0d6efd;
          box-shadow: 0 2px 4px rgba(13, 110, 253, 0.3);
        }
        .rbc-toolbar-label {
            font-weight: 700;
            font-size: 1.1rem;
            color: #343a40;
        }

        /* Estilo del "Evento Fantasma" al arrastrar (Preview) */
        .rbc-addons-dnd-drag-preview {
            background-color: rgba(13, 110, 253, 0.6);
            border: 2px dashed #0d6efd;
            border-radius: 4px;
            color: white;
            z-index: 1000;
        }
      `}</style>
    </div>
  );
};

export default AgendaCalendar;