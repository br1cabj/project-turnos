export const SECTORS = {
  beauty: {
    label: 'Estética / Barbería',
    resourceLabel: 'Profesional', // Ej: Juan
    serviceLabel: 'Servicio', // Ej: Corte
    actionLabel: 'Reservar Turno',
    icon: '✂️',
    //cARatecteristicas
    features: {
      vehicleInfo: false,
      clinicalHistory: false,
      partialPayment: true,
      recurring: true,
    },
  },
  sports: {
    label: 'Clubes / Canchas',
    resourceLabel: 'Cancha/Espacio', // Ej: Cancha 1
    serviceLabel: 'Tipo de Alquiler', // Ej: Fútbol 5 - 1h
    actionLabel: 'Reservar Cancha',
    icon: '⚽',
    //cARatecteristicas
    features: {
      vehicleInfo: false,
      clinicalHistory: false,
      partialPayment: true,
      recurring: true,
    },
  },
  health: {
    label: 'Salud / Consultorios',
    resourceLabel: 'Especialista',
    serviceLabel: 'Tipo de Consulta',
    actionLabel: 'Agendar Cita',
    icon: '🩺',
    //cARatecteristicas
    features: {
      vehicleInfo: false,
      clinicalHistory: true,
      partialPayment: false,
      recurring: true,
    },
  },
  automotive: {
    label: 'Talleres / Mecánica',
    resourceLabel: 'Box / Mecánico',
    serviceLabel: 'Trabajo',
    actionLabel: 'Agendar Reparación',
    icon: '🔧',
    //cARatecteristicas
    features: {
      vehicleInfo: true,
      clinicalHistory: false,
      partialPayment: false,
    },
  },
  generic: {
    label: 'Otro / Genérico',
    resourceLabel: 'Recurso',
    serviceLabel: 'Servicio',
    actionLabel: 'Reservar',
    icon: '📅',
    //cARatecteristicas
    features: {
      vehicleInfo: false,
      clinicalHistory: false,
      partialPayment: false,
    },
  },
};

export const getSectorConfig = (type) => {
  return SECTORS[type] || SECTORS.generic;
};
