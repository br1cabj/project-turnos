import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Container, Button, Offcanvas, Navbar } from "react-bootstrap";
import { List } from "react-bootstrap-icons";
import { useTheme } from '../contexts/ThemeContext'


export default function MainLayout({ children }) {

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const { theme } = useTheme()

  const handleClose = () => setShowMobileMenu(false);
  const handleShow = () => setShowMobileMenu(true);
  return (
    <div className="d-flex" style={{ height: "100vh", overflow: "hidden" }}>

      {/* 1. SIDEBAR DE ESCRITORIO (Se oculta en cel) */}
      <div className="d-none d-md-block border-end" style={{ backgroundColor: theme.sidebarBg, borderColor: theme.borderColor }}>
        <Sidebar />
      </div>

      {/* 2. SIDEBAR (Offcanvas) */}
      <Offcanvas show={showMobileMenu} onHide={handleClose} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menú</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0" style={{ backgroundColor: theme.sidebarBg }}>
          <div onClick={handleClose}>
            <Sidebar />
          </div>
        </Offcanvas.Body>
      </Offcanvas>


      {/* 3. ÁREA PRINCIPAL */}
      <div className="flex-grow-1 d-flex flex-column" style={{ backgroundColor: theme.mainBg, transition: 'background-color 0.3s' }}>

        {/* --- TOPBAR MÓVIL --- */}
        <div className="d-md-none bg-white border-bottom p-2 d-flex align-items-center shadow-sm">
          <Button variant="link" className="text-dark p-1" onClick={handleShow}>
            <List size={28} />
          </Button>
          <span className="ms-2 fw-bold h5 mb-0">Panel de Turnos</span>
        </div>

        {/* --- CONTENIDO DINÁMICO --- */}
        <div className="overflow-auto p-4" style={{ height: "100%" }}>
          <Container fluid>
            {children}
          </Container>
        </div>
      </div>
    </div>
  );
}