import { useState, useEffect, useCallback } from 'react';
import {
  getTenantBySlug,
  getCollection,
  getAppointmentsByDate,
  createAppointment,
  createReview,
} from '../services/dbService';
import { sendNewBookingAlert } from '../services/emailService';
import Swal from 'sweetalert2';

export function usePublicBooking(slug) {
  // Datos del Negocio
  const [tenant, setTenant] = useState(null);
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);

  // Estado de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  // Estado del Wizard
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    service: null,
    resource: null,
    date: '',
    time: null,
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    notes: '',
  });

  const [availableSlots, setAvailableSlots] = useState([]);

  // --- 1. CARGA INICIAL ---
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!slug) return;
      try {
        const business = await getTenantBySlug(slug);

        if (!business)
          throw new Error('Negocio no encontrado o enlace inválido.');
        if (business.status === 'suspended')
          throw new Error(
            'Este negocio no está aceptando turnos temporalmente.'
          );

        if (isMounted) {
          setTenant(business);
          // Carga paralela para velocidad
          const [s, r] = await Promise.all([
            getCollection('services', business.id),
            getCollection('resources', business.id),
          ]);
          setServices(s);
          setResources(r);
        }
      } catch (err) {
        if (isMounted)
          setError(err.message || 'Error al cargar información del negocio.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // --- 2. CÁLCULO DE HORARIOS (Lógica Avanzada) ---
  const calculateAvailability = useCallback(
    async (dateStr, service, selectedResource) => {
      setAvailableSlots([]); // Limpiar mientras calcula
      if (!dateStr || !service || !tenant) return;

      // A. Configuración del día
      const dateObj = new Date(`${dateStr}T00:00:00`);
      const dayIndex = dateObj.getDay();

      const dayConfig = tenant.openingHours?.[dayIndex];

      if (!dayConfig || !dayConfig.isOpen) {
        console.log('Día cerrado según configuración');
        return;
      }

      // B. Obtener turnos existentes de la DB
      const existingAppointments = await getAppointmentsByDate(
        tenant.id,
        dateStr
      );

      // C. Preparar variables de tiempo
      const durationMs = service.duration * 60000;
      const [startH, startM] = dayConfig.start.split(':').map(Number);
      const [endH, endM] = dayConfig.end.split(':').map(Number);

      // Definir inicio y fin del día laboral en timestamps
      const workStart = new Date(dateObj);
      workStart.setHours(startH, startM, 0, 0);

      const workEnd = new Date(dateObj);
      workEnd.setHours(endH, endM, 0, 0);

      // Si es "HOY", no mostrar horarios pasados
      const now = new Date();
      let iteratorTime = new Date(workStart);

      if (
        now.getDate() === dateObj.getDate() &&
        now.getMonth() === dateObj.getMonth()
      ) {
        if (now > iteratorTime) {
          iteratorTime = new Date(now);
          const remainder = 30 - (iteratorTime.getMinutes() % 30);
          iteratorTime.setMinutes(iteratorTime.getMinutes() + remainder);
          iteratorTime.setSeconds(0);
        }
      }

      const slots = [];

      const STEP_MINUTES = 30;

      while (iteratorTime.getTime() + durationMs <= workEnd.getTime()) {
        const slotStart = new Date(iteratorTime);
        const slotEnd = new Date(iteratorTime.getTime() + durationMs);

        // E. Chequeo de Disponibilidad
        let isAvailable = false;

        if (selectedResource) {
          const hasConflict = existingAppointments.some(
            (appt) =>
              appt.resourceId === selectedResource.id &&
              slotStart < appt.end &&
              slotEnd > appt.start
          );
          isAvailable = !hasConflict;
        } else {
          // Filtramos qué recursos están ocupados en este slot
          const busyResourceIds = existingAppointments
            .filter((appt) => slotStart < appt.end && slotEnd > appt.start)
            .map((appt) => appt.resourceId);

          if (busyResourceIds.length < resources.length) {
            isAvailable = true;
          }
        }

        if (isAvailable) {
          const h = slotStart.getHours().toString().padStart(2, '0');
          const m = slotStart.getMinutes().toString().padStart(2, '0');
          slots.push(`${h}:${m}`);
        }

        // Avanzar iterador
        iteratorTime.setMinutes(iteratorTime.getMinutes() + STEP_MINUTES);
      }

      setAvailableSlots(slots);
    },
    [tenant, resources]
  );

  useEffect(() => {
    if (step === 3 && bookingData.date && bookingData.service) {
      calculateAvailability(
        bookingData.date,
        bookingData.service,
        bookingData.resource
      );
    }
  }, [
    bookingData.date,
    bookingData.service,
    bookingData.resource,
    step,
    calculateAvailability,
  ]);

  // --- 3. ACCIONES ---

  const updateBooking = (field, value) => {
    setBookingData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => Math.max(1, prev - 1));

  // ASIGNACIÓN INTELIGENTE DE RECURSO
  const getBestAvailableResource = async (slotStart, slotEnd) => {
    if (bookingData.resource) return bookingData.resource;

    const dateStr = bookingData.date;
    const existingAppointments = await getAppointmentsByDate(
      tenant.id,
      dateStr
    );

    // Identificar recursos ocupados en ese rango
    const busyResourceIds = existingAppointments
      .filter((appt) => slotStart < appt.end && slotEnd > appt.start)
      .map((appt) => appt.resourceId);

    // Filtrar recursos disponibles
    const availableResources = resources.filter(
      (r) => !busyResourceIds.includes(r.id)
    );

    if (availableResources.length === 0)
      throw new Error('Lo sentimos, el horario ya no está disponible.');

    const randomIndex = Math.floor(Math.random() * availableResources.length);
    return availableResources[randomIndex];
  };

  const confirmBooking = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const {
        service,
        date,
        time,
        clientName,
        clientPhone,
        clientEmail,
        notes,
      } = bookingData;

      // Reconstruir fechas (Objetos Date)
      const start = new Date(`${date}T${time}`);
      const end = new Date(start.getTime() + service.duration * 60000);

      // ASIGNACIÓN FINAL DE RECURSO
      const assignedResource = await getBestAvailableResource(start, end);

      const newAppt = {
        tenantId: tenant.id,
        title: service.name,
        client: clientName,
        clientPhone: clientPhone,
        clientEmail: clientEmail || '',
        notes: notes || '',
        resourceId: assignedResource.id,
        resourceName: assignedResource.name,
        serviceId: service.id,
        price: service.price,
        start,
        end,
        status: 'pending',
        createdAt: new Date(),
        bgColor: '#dbeafe',
        textColor: '#1e40af',
        borderColor: '#3b82f6',
      };

      await createAppointment(newAppt);

      // Enviar email (no bloqueante)
      sendNewBookingAlert(
        { ...newAppt, tenantName: tenant.name },
        tenant.ownerEmail
      ).catch((err) => console.warn('Fallo envío email:', err));

      setStep(5); // Pantalla Éxito
    } catch (error) {
      console.error(error);
      Swal.fire(
        'Ups!',
        error.message ||
          'No pudimos procesar la reserva. Intenta otro horario.',
        'error'
      );
      // Si falla por disponibilidad, podríamos volver al paso 3
      if (error.message.includes('disponible')) setStep(3);
    } finally {
      setProcessing(false);
    }
  };

  const submitReview = async (reviewData) => {
    setProcessing(true);
    try {
      await createReview({
        ...reviewData,
        tenantId: tenant.id,
        createdAt: new Date(),
        approved: true, // Auto-aprobar o false para moderación
      });
      return true;
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo enviar la reseña', 'error');
      return false;
    } finally {
      setProcessing(false);
    }
  };

  return {
    tenant,
    services,
    resources,
    loading,
    error,
    processing,
    step,
    bookingData,
    availableSlots,
    updateBooking,
    nextStep,
    prevStep,
    confirmBooking,
    submitReview,
    setStep,
  };
}
