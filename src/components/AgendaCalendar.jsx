import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendar.css';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

const messages = {
  allDay: 'Todo el día',
  previous: 'Anterior',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay turnos en este rango.',
};

// --- COMPONENTE VISUAL DEL TURNO ---
const CustomEvent = ({ event }) => {
  const background = event.bgColor || '#3788d8';
  const text = event.textColor || '#ffffff';
  const border = event.borderColor || '#2c6cb0';

  return (
    <div
      className="custom-event-box"
      style={{
        backgroundColor: background,
        color: text,
        borderLeftColor: border,
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      <div className="fw-bold" style={{ fontSize: '0.85rem' }}>
        {event.title || 'Turno sin título'}
      </div>
      <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
        👤 {event.client || 'Sin nombre'}
      </div>
    </div>
  );
};

const formats = {
  timeGutterFormat: 'HH:mm', // Eje Y (la columna de horas)
  eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
    `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
  agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
    `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
};

const DnDCalendar = withDragAndDrop(Calendar)

const AgendaCalendar = ({
  events = [],
  resources = [],
  onSelectEvent,
  onMoveEvent,
  onResizeEvent,
  minTime,
  maxTime }) => {
  const [view, setView] = useState('day');
  const [date, setDate] = useState(new Date());

  const handleOnChangeView = (selectedView) => {
    setView(selectedView);
  };

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  //FIX
  const resourceToDisplay = view === 'day' ? resources : undefined

  const defaultMin = new Date(0, 0, 0, 7, 0, 0)
  const defaultMax = new Date(0, 0, 0, 23, 0, 0)

  return (
    <div style={{ height: 600 }} className="bg-white p-2">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 550 }}
        culture='es'
        messages={messages}
        formats={formats}
        onSelectEvent={onSelectEvent}

        //DRAG AND DROP
        onEventDrop={onMoveEvent}
        onEventResize={onResizeEvent}
        resizable

        //VIEW
        view={view}
        date={date}
        onView={handleOnChangeView}
        onNavigate={handleNavigate}

        // RECURSOS
        resources={resourceToDisplay}
        resourceIdAccessor="id"
        resourceTitleAccessor="title"

        defaultView="day"
        views={['day', 'week', 'agenda']}

        step={30}
        timeslots={2}
        min={minTime || defaultMin}
        max={maxTime || defaultMax}

        components={{
          event: CustomEvent
        }}
      />
    </div>
  );
};

export default AgendaCalendar;