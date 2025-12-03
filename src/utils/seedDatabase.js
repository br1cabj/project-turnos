import { db, auth } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const createMockBusiness = async () => {
  const user = auth.currentUser;
  if (!user) return alert('Error: No estás logueado.');

  console.log('Iniciando creación de negocio para:', user.email);

  try {
    // 1. Crear el NEGOCIO (Tenant)
    const businessData = {
      name: 'Mi Negocio SaaS',
      slug: 'mi-negocio',
      ownerId: user.uid,
      createdAt: new Date(),
      phone: '+5491100000000',
    };

    const tenantRef = await addDoc(collection(db, 'tenants'), businessData);
    console.log('✅ Negocio creado con ID:', tenantRef.id);

    // 2. Crear un RECURSO de prueba (Para que el calendario no se rompa)
    await addDoc(collection(db, 'resources'), {
      tenantId: tenantRef.id,
      name: 'Juan Pérez (Ejemplo)',
      type: 'staff',
      active: true,
    });

    // 3. Crear un SERVICIO de prueba
    await addDoc(collection(db, 'services'), {
      tenantId: tenantRef.id,
      name: 'Corte Básico',
      duration: 30,
      price: 5000,
    });

    alert('¡ÉXITO! Base de datos inicializada. Recarga la página.');
  } catch (error) {
    console.error('Error creando datos:', error);
    alert('Hubo un error. Mira la consola (F12).');
  }
};
