import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';

// Función auxiliar
const getNextDays = (startDate, daysToAdd) => {
  const dates = [];
  for (let i = 0; i < daysToAdd; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  return dates;
};

export default function DateSelector({ selectedDate, onDateChange }) {
  const [currentStart, setCurrentStart] = useState(new Date());
  const [visibleDates, setVisibleDates] = useState([]);

  // Generar los 5 días visibles
  useEffect(() => {
    setVisibleDates(getNextDays(currentStart, 5));
  }, [currentStart]);

  // Formatear fecha para comparar (YYYY-MM-DD)
  const formatDateISO = (date) => date.toISOString().split('T')[0];

  const handlePrev = () => {
    const newStart = new Date(currentStart);
    newStart.setDate(currentStart.getDate() - 5);
    // No ir al pasado
    if (newStart < new Date()) setCurrentStart(new Date());
    else setCurrentStart(newStart);
  };

  const handleNext = () => {
    const newStart = new Date(currentStart);
    newStart.setDate(currentStart.getDate() + 5);
    setCurrentStart(newStart);
  };

  return (
    <div className="d-flex align-items-center justify-content-between mb-4">
      <Button variant="light" size="sm" onClick={handlePrev} disabled={currentStart <= new Date()}>
        <ChevronLeft />
      </Button>

      <div className="d-flex gap-2 overflow-auto px-2" style={{ scrollbarWidth: 'none' }}>
        {visibleDates.map((date) => {
          const isSelected = selectedDate === formatDateISO(date);
          const isToday = formatDateISO(date) === formatDateISO(new Date());

          // Formato día semana (Lun, Mar)
          const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
          // Formato número día (01, 30)
          const dayNumber = date.getDate();

          return (
            <div
              key={date.toString()}
              onClick={() => onDateChange(formatDateISO(date))}
              className={`text-center p-2 rounded cursor-pointer border ${isSelected ? 'bg-primary text-white border-primary' : 'bg-white border-light'}`}
              style={{ minWidth: '60px', cursor: 'pointer', transition: '0.2s' }}
            >
              <div className={`small text-uppercase fw-bold ${isSelected ? 'text-white' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                {isToday ? 'HOY' : dayName}
              </div>
              <div className="fs-5 fw-bold">
                {dayNumber}
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="light" size="sm" onClick={handleNext}>
        <ChevronRight />
      </Button>
    </div>
  );
}