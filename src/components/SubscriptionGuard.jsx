import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMyBusiness } from '../services/dbService';
import { Container, Card, Button } from 'react-bootstrap';
import { LockFill, CalendarX } from 'react-bootstrap-icons';

export default function SubscriptionGuard({ children }) {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState('loading');
  const [tenantData, setTenantData] = useState(null);

  useEffect(() => {
    async function checkSubscription() {
      if (!currentUser) return;

      const business = await getMyBusiness(currentUser.uid, currentUser.email);

      if (!business) {
        setStatus('ok');
        return;
      }

      setTenantData(business);

      // 1. CHEQUEO DE SUSPENSIÓN MANUAL 
      if (business.status === 'suspended') {
        setStatus('suspended');
        return;
      }

      // 2. CHEQUEO DE VENCIMIENTO (30 Días)
      if (business.trialEndsAt) {
        const now = new Date();
        const trialEnd = business.trialEndsAt.toDate();

        if (now > trialEnd && business.plan !== 'pro') {
          setStatus('expired');
          return;
        }
      }

      setStatus('ok');
    }

    checkSubscription();
  }, [currentUser]);

  if (status === 'loading') return <div className="p-5 text-center">Verificando suscripción...</div>;

  // PANTALLA DE BLOQUEO: SUSPENDIDO
  if (status === 'suspended') {
    return (
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <Card className="text-center p-5 shadow border-danger" style={{ maxWidth: "500px" }}>
          <div className="text-danger mb-3"><LockFill size={60} /></div>
          <h2 className="fw-bold text-danger">Cuenta Suspendida</h2>
          <p className="lead">
            El acceso a <strong>{tenantData?.name}</strong> ha sido restringido temporalmente.
          </p>
          <p className="text-muted">
            Por favor, contacta al soporte para regularizar tu situación.
          </p>
          <Button variant="danger" href="mailto:soporte@tuempresa.com">Contactar Soporte</Button>
        </Card>
      </Container>
    );
  }

  // PANTALLA DE BLOQUEO: VENCIDO
  if (status === 'expired') {
    return (
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <Card className="text-center p-5 shadow border-warning" style={{ maxWidth: "500px" }}>
          <div className="text-warning mb-3"><CalendarX size={60} /></div>
          <h2 className="fw-bold">Tu prueba ha finalizado 😢</h2>
          <p className="lead">
            ¡Esperamos que hayas disfrutado tus 30 días gratis!
          </p>
          <p>
            Para seguir gestionando tus turnos y no perder tus datos, actualiza al Plan Pro.
          </p>
          <Button variant="primary" size="lg">Quiero el Plan Pro</Button>
        </Card>
      </Container>
    );
  }

  return children;
}