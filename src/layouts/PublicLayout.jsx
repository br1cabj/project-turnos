import React from 'react';
import { Container } from 'react-bootstrap';
import { LightningChargeFill } from 'react-bootstrap-icons';
import { Whatsapp } from 'react-bootstrap-icons'

export default function PublicLayout({ children }) {
  const PHONE_NUMBER = '5493884442727';
  const message = "Hola! Vi el sistema de turnos y me interesa tener uno para mi negocio.";
  const whatsappUrl = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
  return (
    <div
      style={{
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* --- HEADER --- */}
      <div className="bg-white shadow-sm py-3 mb-4">
        <Container className="text-center">
          <h5 className="mb-0 fw-bold text-primary">CloudStock</h5>
        </Container>
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <Container style={{ maxWidth: "600px", flex: 1 }}>
        {children}
      </Container>

      {/* --- FOOTER PROMOCIONAL --- */}
      <footer className="text-center py-4 mt-auto">
        <hr className="w-50 mx-auto text-muted mb-3" />

        <div className="text-muted small mb-2">
          ¿Te gustaría tener este sistema en tu negocio?
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline-success btn-sm rounded-pill px-3 fw-bold"
        >
          <Whatsapp className="me-2" />
          Contáctame por WhatsApp
        </a>

        <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
          Desarrollado con ❤️ por CloudTeam
        </div>
      </footer>

    </div>
  )
}