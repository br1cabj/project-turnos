import { db, storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
  orderBy,
  or,
  getDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { add } from 'date-fns';
import { auth } from '../config/firebase';

export const getMyBusiness = async (userId, userEmail = '') => {
  if (!userId) {
    console.warn('⚠️ getMyBusiness llamado sin userId');
    return null;
  }

  try {
    const qId = query(
      collection(db, 'tenants'),
      where('ownerId', '==', userId)
    );
    const snapshotId = await getDocs(qId);

    if (!snapshotId.empty) {
      return { id: snapshotId.docs[0].id, ...snapshotId.docs[0].data() };
    }

    // 3. Intento 2: Buscar por Email
    if (userEmail) {
      const emailToSearch = userEmail.toLowerCase();

      const qEmail = query(
        collection(db, 'tenants'),
        where('ownerEmail', '==', userEmail)
      );

      const snapshotEmail = await getDocs(qEmail);

      if (!snapshotEmail.empty) {
        const docRef = snapshotEmail.docs[0].ref;

        await updateDoc(docRef, { ownerId: userId });

        return {
          id: snapshotEmail.docs[0].id,
          ...snapshotEmail.docs[0].data(),
        };
      }
    }

    console.warn('❌ No se encontró ningún negocio asociado a este usuario.');
    return null;
  } catch (error) {
    console.error('🔥 Error crítico en getMyBusiness:', error);
    return null;
  }
};

export const getCollection = async (collectionName, tenantId) => {
  const q = query(
    collection(db, collectionName),
    where('tenantId', '==', tenantId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const createAppointment = async (appointmentData) => {
  const dataToSave = {
    ...appointmentData,
    start: Timestamp.fromDate(appointmentData.start),
    end: Timestamp.fromDate(appointmentData.end),
    createdAt: Timestamp.now(),
  };
  return await addDoc(collection(db, 'appointments'), dataToSave);
};

export const subscribeToAppointments = (tenantId, callback) => {
  const q = query(
    collection(db, 'appointments'),
    where('tenantId', '==', tenantId)
  );

  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        start: data.start.toDate(),
        end: data.end.toDate(),
      };
    });
    callback(events);
  });
};

export const saveDocument = async (collectionName, data) => {
  return await addDoc(collection(db, collectionName), data);
};

export const deleteDocument = async (collectionName, docId) => {
  await deleteDoc(doc(db, collectionName, docId));
};

export const getClientHistory = async (tenantId, clientName) => {
  const q = query(
    collection(db, 'appointments'),
    where('tenantId', '==', tenantId),
    where('client', '==', clientName),
    orderBy('start', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const updateDocument = async (collectionName, docId, data) => {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
};

export const getTenantBySlug = async (slug) => {
  const q = query(collection(db, 'tenants'), where('slug', '==', slug));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

export const getAppointmentsByDate = async (tenantId, dateString) => {
  const startOfDay = new Date(`${dateString}T00:00:00`);
  const endOfDay = new Date(`${dateString}T23:59:59`);

  const q = query(
    collection(db, 'appointments'),
    where('tenantId', '==', tenantId),
    where('start', '>=', Timestamp.fromDate(startOfDay)),
    where('start', '<=', Timestamp.fromDate(endOfDay))
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      start: data.start.toDate(),
      end: data.end.toDate(),
    };
  });
};

export const uploadLogo = async (file, tenantId) => {
  const storageRef = ref(storage, `logos/${tenantId}`);

  await uploadBytes(storageRef, file);

  return await getDownloadURL(storageRef);
};

//SUPERADMIN
export const getAllTenants = async () => {
  const snapshot = await getDocs(collection(db, 'tenants'));
  return snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return { id: doc.id, ...data };
  });
};

export const createTenant = async (data) => {
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 30);

  return await addDoc(collection(db, 'tenants'), {
    ...data,
    createdAt: new Date(),
    status: 'active',
    plan: 'trial',
    trialEndsAt: Timestamp.fromDate(trialEndDate),
    ownerId: null,
  });
};

export const exportToCSV = (data, filename) => {
  if (!data || !data.length) return alert('No hay datos para exportar');

  // Extraer encabezados
  const headers = Object.keys(data[0]).join(',');

  // Convertir filas
  const rows = data.map((row) =>
    Object.values(row)
      .map((value) => {
        // Limpiar datos para que no rompan el CSV
        const stringValue = String(value);
        return `"${stringValue.replace(/"/g, '""')}"`; // Escapar comillas
      })
      .join(',')
  );

  // Unir todo
  const csvContent = [headers, ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const deleteTenantFully = async (tenantId) => {
  const collectionsToCheck = [
    'appointments',
    'services',
    'resources',
    'clients',
    'movements',
  ];

  const deletePromises = collectionsToCheck.map(async (colName) => {
    const q = query(collection(db, colName), where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);

    const batchPromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    return Promise.all(batchPromises);
  });

  await Promise.all(deletePromises);

  await deleteDoc(doc(db, 'tenants', tenantId));
};

export const updateTenantData = async (tenantId, newData) => {
  const docRef = doc(db, 'tenants', tenantId);
  await updateDoc(docRef, newData);
};

export const addClinicalNote = async (tenantId, clientId, text) => {
  return await addDoc(collection(db, 'clinicalNotes'), {
    tenantId,
    clientId,
    text,
    createdAt: new Date(),
    createdBy: auth.currentUser.email,
  });
};

export const getClinicalNotes = async (tenantId, clientId) => {
  const q = query(
    collection(db, 'clinicalNotes'),
    where('tenantId', '==', tenantId),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt),
    };
  });
};

export const createRecurringAppointments = async (
  baseAppointment,
  weeksToRepeat
) => {
  const created = [];
  const failed = [];

  for (let i = 1; i <= weeksToRepeat; i++) {
    const nextStart = new Date(baseAppointment.start);
    const nextEnd = new Date(baseAppointment.end);

    nextStart.setDate(nextStart.getDate() + i * 7);
    nextEnd.setDate(nextEnd.getDate() + i * 7);
    try {
      const newAppt = {
        ...baseAppointment,
        start: Timestamp.fromDate(nextStart),
        end: Timestamp.fromDate(nextEnd),
        status: 'pending',
        deposit: 0,
        balance: baseAppointment.price,
        isRecurring: true,
        originalApptId: null,
      };

      const ref = await addDoc(collection(db, 'appointments'), newAppt);
      created.push(nextStart.toLocaleDateString());
    } catch (error) {
      console.error(error);
      failed.push(nextStart.toLocaleDateString());
    }
  }
  return { created, failed };
};

export const createReview = async (reviewData) => {
  return await addDoc(collection(db, 'reviews'), {
    ...reviewData,
    createdAt: new Date(),
  });
};

export const getReviews = async (tenantId) => {
  const q = query(
    collection(db, 'reviews'),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const uploadResourcePhoto = async (file, tenantId) => {
  const fileName = `resources/${tenantId}/ ${Date.now()}_${file.name}`;
  const storageRef = ref(storage, fileName);

  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};
