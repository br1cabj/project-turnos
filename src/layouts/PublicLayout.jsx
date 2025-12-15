import React from 'react';
import { Container } from 'react-bootstrap';
import { Whatsapp, LightningChargeFill } from 'react-bootstrap-icons';

export default function PublicLayout({ children }) {
  const PHONE_NUMBER = '5493884442727'; // Tu número de ventas
  const message = "Hola! Vi el sistema de turnos CloudTurn y me interesa tener uno para mi negocio.";
  const whatsappUrl = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <div className="layout-wrapper">

      {/* --- HEADER (Marca del Software) --- */}
      <header className="bg-white shadow-sm py-3 sticky-top">
        <Container className="d-flex justify-content-center align-items-center">
          <div className="d-flex align-items-center text-primary gap-2">
            <LightningChargeFill size={20} />
            <h5 className="mb-0 fw-bold tracking-tight">CloudTurn</h5>
          </div>
        </Container>
      </header>

      {/* --- CONTENIDO PRINCIPAL (Wizard) --- */}
      <main className="flex-grow-1 py-4 d-flex justify-content-center">
        <Container style={{ maxWidth: "600px", width: "100%" }}>
          {children}
        </Container>
      </main>

      {/* --- FOOTER (Powered By) --- */}
      <footer className="bg-light py-4 mt-auto border-top">
        <Container className="text-center">

          <div className="mb-3">
            <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
              Potenciado por CloudTurn
            </small>
          </div>

          <div className="d-inline-block p-3 bg-white rounded shadow-sm border footer-promo">
            <p className="text-muted small mb-2 fw-500">
              ¿Quieres un sistema de turnos para tu negocio?
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-sm rounded-pill px-4 fw-bold d-inline-flex align-items-center gap-2 hover-lift"
            >
              <Whatsapp size={16} />
              Contratar Sistema
            </a>
          </div>

          <div className="mt-4 text-muted opacity-50" style={{ fontSize: '0.75rem' }}>
            &copy; {new Date().getFullYear()} CloudTurn App. Todos los derechos reservados.
          </div>
        </Container>
      </footer>

      {/* Estilos Globales para este layout */}
      <style>{`
        .layout-wrapper {
          background-color: #f8f9fa; /* Fallback */
          background-image: linear-gradient(to bottom, #f8f9fa, #ffffff);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .tracking-tight { letter-spacing: -0.5px; }
        .fw-500 { font-weight: 500; }
        
        .hover-lift { transition: transform 0.2s; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(25, 135, 84, 0.2); }
        
        /* Ajuste para móviles: evitar que el teclado tape inputs si fuera necesario */
        @media (max-width: 576px) {
          .layout-wrapper { background-color: #ffffff; }
        }
      `}</style>
    </div>
  );
}