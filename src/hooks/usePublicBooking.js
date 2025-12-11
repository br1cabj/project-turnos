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
  });

  const [availableSlots, setAvailableSlots] = useState([]);

  // --- CARGA INICIAL ---
  useEffect(() => {
    async function init() {
      try {
        const business = await getTenantBySlug(slug);
        if (!business) throw new Error('Negocio no encontrado');

        setTenant(business);
        const [s, r] = await Promise.all([
          getCollection('services', business.id),
          getCollection('resources', business.id),
        ]);

        setServices(s);
        setResources(r);
      } catch (err) {
        setError(err.message || 'Error al cargar');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [slug]);

  // --- 2. CÁLCULO DE HORARIOS ---
  const calculateAvailability = useCallback(
    async (date, service, resourceId) => {
      setAvailableSlots([]);
      if (!date || !service || !tenant) return;

      const dateObj = new Date(date + 'T00:00:00');
      const dayIndex = dateObj.getDay();
      const dayConfig = tenant.openingHours?.[dayIndex];

      if (!dayConfig || !dayConfig.isOpen) return;

      // B. Obtener turnos existentes
      const existingAppointments = await getAppointmentsByDate(tenant.id, date);

      // C. Generar slots
      let slots = [];
      const duration = service.duration;
      const [startH, startM] = dayConfig.start.split(':');
      const [endH, endM] = dayConfig.end.split(':');

      let current = new Date(dateObj);
      current.setHours(parseInt(startH), parseInt(startM), 0);

      const endTime = new Date(dateObj);
      endTime.setHours(parseInt(endH), parseInt(endM), 0);

      while (current < endTime) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + duration * 60000);

        if (slotEnd > endTime) break;

        // D. Chequeo de colisiones
        let isBusy = false;

        if (resourceId) {
          isBusy = existingAppointments.some(
            (appt) =>
              appt.resourceId === resourceId &&
              slotStart < appt.end &&
              slotEnd > appt.start
          );
        } else {
          const overlapping = existingAppointments.filter(
            (appt) => slotStart < appt.end && slotEnd > appt.start
          );
          if (overlapping.length >= resources.length) isBusy = true;
        }

        if (!isBusy) {
          const h = slotStart.getHours().toString().padStart(2, '0');
          const m = slotStart.getMinutes().toString().padStart(2, '0');
          slots.push(`${h}:${m}`);
        }

        current.setMinutes(current.getMinutes() + 30);
      }

      setAvailableSlots(slots);
    },
    [tenant, resources]
  );

  useEffect(() => {
    if (step === 3 && bookingData.date && bookingData.service) {
      const resId = bookingData.resource?.id || null;
      calculateAvailability(bookingData.date, bookingData.service, resId);
    }
  }, [
    bookingData.date,
    bookingData.service,
    bookingData.resource,
    step,
    calculateAvailability,
  ]);

  // --- ACCIONES ---

  const updateBooking = (field, value) => {
    setBookingData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const confirmBooking = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const { service, resource, date, time, clientName, clientPhone } =
        bookingData;

      const start = new Date(`${date}T${time}`);
      const end = new Date(start.getTime() + service.duration * 60000);

      const finalResource = resource || resources[0];

      const newAppt = {
        tenantId: tenant.id,
        title: service.name,
        client: clientName,
        clientPhone: clientPhone,
        resourceId: finalResource.id,
        resourceName: finalResource.name,
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
      sendNewBookingAlert(
        { ...newAppt, tenantName: tenant.name },
        tenant.ownerEmail
      );

      setStep(5); // Éxito
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No pudimos procesar la reserva', 'error');
    }
    setProcessing(false);
  };

  const submitReview = async (reviewData) => {
    setProcessing(true);
    try {
      await createReview({
        ...reviewData,
        tenantId: tenant.id,
        createdAt: new Date(),
        approved: true,
      });
      Swal.fire('¡Gracias!', 'Tu calificación ha sido enviada.', 'success');
      return true;
    } catch (e) {
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
