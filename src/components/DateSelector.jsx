import React, { useMemo } from 'react';
import { Form } from 'react-bootstrap';
import { CalendarDate } from 'react-bootstrap-icons';

export default function DateSelector({ selectedDate, onDateChange }) {

  const nextDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);

      // Formato YYYY-MM-DD para el value
      const fullDate = d.toISOString().split('T')[0];

      // Formatos visuales
      const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }); // "lun", "mar"
      const dayNum = d.getDate();

      return { full: fullDate, dayName, dayNum };
    });
  }, []);

  return (
    <div className="w-100">
      {/* 1. TÍTULO OPCIONAL (Contexto visual) */}
      <div className="d-flex align-items-center mb-2 text-muted small fw-bold text-uppercase">
        <CalendarDate className="me-2" /> Seleccionar Día
      </div>

      {/* 2. CONTENEDOR FLEXIBLE (Scroll horizontal en móviles) */}
      <div className="d-flex align-items-center gap-2 overflow-auto pb-2 px-1 hide-scrollbar">

        {/* Píldoras de Días Próximos */}
        {nextDays.map((day) => {
          const isActive = selectedDate === day.full;

          return (
            <div
              key={day.full}
              onClick={() => onDateChange(day.full)}
              className={`
                date-pill d-flex flex-column align-items-center justify-content-center 
                border rounded px-3 py-2 cursor-pointer transition-all
                ${isActive ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-dark'}
              `}
              style={{ minWidth: '70px', height: '65px', cursor: 'pointer' }}
            >
              <span className={`small text-uppercase fw-bold ${isActive ? 'opacity-100' : 'opacity-50'}`} style={{ fontSize: '0.75rem', lineHeight: 1 }}>
                {day.dayName}
              </span>
              <span className="fs-4 fw-bold" style={{ lineHeight: 1.2 }}>
                {day.dayNum}
              </span>
            </div>
          );
        })}

        {/* Separador visual */}
        <div className="border-end mx-1" style={{ height: '40px' }}></div>

        {/* 3. INPUT NATIVO (Para fechas lejanas) */}
        <div className="position-relative">
          <Form.Control
            type="date"
            required
            value={selectedDate || ''}
            min={new Date().toISOString().split('T')[0]} // No permitir pasado
            onChange={(e) => onDateChange(e.target.value)}
            className="shadow-sm border-0 bg-light text-primary fw-bold"
            style={{
              height: '65px',
              cursor: 'pointer',
              minWidth: 'auto'
            }}
          />
          {/* Label flotante para UX */}
          {!selectedDate && (
            <div
              className="position-absolute top-50 start-50 translate-middle text-muted small pe-none"
              style={{ whiteSpace: 'nowrap' }}
            >
              Otra fecha
            </div>
          )}
        </div>
      </div>

      {/* Estilos CSS Inline */}
      <style>{`
        .date-pill:hover {
          transform: translateY(-2px);
          background-color: #f8f9fa;
        }
        .date-pill.bg-primary:hover {
          background-color: #0b5ed7 !important; /* Darker blue */
          color: white !important;
        }
        .hide-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .hide-scrollbar::-webkit-scrollbar-thumb {
          background: #dee2e6;
          border-radius: 4px;
        }
        .transition-all {
          transition: all 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
}