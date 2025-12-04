export const THEMES = {
  // 1. CLÁSICO (OSCURO) - Ideal para Barberías, Talleres, Gimnasios
  dark: {
    id: 'dark',
    name: 'Clásico (Oscuro)',
    sidebarBg: '#212529', // Negro grisáceo
    sidebarText: '#ffffff',
    mainBg: '#f3f4f6', // Gris muy claro
    activeItem: '#0d6efd', // Azul Bootstrap
    activeText: '#ffffff',
    borderColor: '#374151',
  },

  light: {
    id: 'light',
    name: 'Blanco (Minimalista)',
    sidebarBg: '#ffffff', // Sidebar Blanca pura
    sidebarText: '#343a40', // Texto Gris Oscuro (casi negro)
    mainBg: '#ffffff', // Fondo general Blanco
    activeItem: '#f8f9fa', // Gris muy muy suave al seleccionar (sutil)
    activeText: '#000000', // Texto negro al seleccionar
    borderColor: '#dee2e6', // Líneas grises suaves para separar
  },

  // 2. ESTÉTICA (ROSA) - Ideal para Uñas, Pestañas, Spa
  pink: {
    id: 'pink',
    name: 'Estética (Rosa)',
    sidebarBg: '#be185d', // Rosa fuerte (Magenta)
    sidebarText: '#ffffff',
    mainBg: '#fff1f2', // Rosa pastel muy suave
    activeItem: '#fbcfe8', // Rosa claro
    activeText: '#831843', // Texto oscuro para contraste
    borderColor: '#9d174d',
  },

  // 3. SALUD (AZUL) - Ideal para Consultorios, Dentistas, Clínicas
  ocean: {
    id: 'ocean',
    name: 'Salud (Azul)',
    sidebarBg: '#ffffff', // Blanco limpio
    sidebarText: '#1e3a8a', // Azul oscuro corporativo
    mainBg: '#eff6ff', // Azul cielo muy suave
    activeItem: '#dbeafe', // Azul claro resaltado
    activeText: '#1e3a8a',
    borderColor: '#e5e7eb', // Gris suave
  },

  // 4. NATURALEZA (VERDE) - Ideal para Nutricionistas, Yoga, Veterinaria
  nature: {
    id: 'nature',
    name: 'Naturaleza (Verde)',
    sidebarBg: '#064e3b', // Verde bosque profundo
    sidebarText: '#ecfdf5', // Verde menta muy claro
    mainBg: '#f0fdf4', // Fondo casi blanco con tinte verde
    activeItem: '#34d399', // Verde esmeralda brillante
    activeText: '#064e3b',
    borderColor: '#065f46',
  },

  // 5. MINIMALISTA (SLATE) - Ideal para Abogados, Contadores, Consultores
  slate: {
    id: 'slate',
    name: 'Corporativo (Gris)',
    sidebarBg: '#1e293b', // Gris Azulado Oscuro (Slate)
    sidebarText: '#f8fafc',
    mainBg: '#f1f5f9', // Gris muy claro
    activeItem: '#475569', // Gris medio
    activeText: '#ffffff',
    borderColor: '#334155',
  },

  // 6. CREATIVO (VIOLETA) - Ideal para Marketing, Diseño, Tatuajes
  violet: {
    id: 'violet',
    name: 'Creativo (Violeta)',
    sidebarBg: '#4c1d95', // Violeta intenso
    sidebarText: '#f5f3ff',
    mainBg: '#faf5ff', // Violeta muy pálido
    activeItem: '#8b5cf6', // Violeta brillante
    activeText: '#ffffff',
    borderColor: '#5b21b6',
  },
};
