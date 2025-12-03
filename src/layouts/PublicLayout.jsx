import React from 'react';
import { Container } from 'react-bootstrap';

export default function PublicLayout({ children }) {
  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", paddingBottom: "50px" }}>
      <div className="bg-white shadow-sm py-3 mb-4">
        <Container className="text-center">
          <h5 className="mb-0 fw-bold text-primary">MiTurno SaaS</h5>
        </Container>
      </div>

      <Container style={{ maxWidth: "600px" }}>
        {children}
      </Container>
    </div>
  )
} 