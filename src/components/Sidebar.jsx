import React, { useState } from "react";
import { Nav, Offcanvas, Button, Container, Navbar } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarWeek,
  PeopleFill,
  Wallet2,
  GearFill,
  BoxArrowLeft,
  List
} from "react-bootstrap-icons";
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from "../contexts/AuthContext";
import logoFull from '../assets/logo-full.png';

// --- CONFIGURACIÓN DE RUTAS ---
const NAV_LINKS = [
  { path: "/", label: "Agenda", icon: <CalendarWeek size={20} /> },
  { path: "/clientes", label: "Clientes", icon: <PeopleFill size={20} /> },
  { path: "/caja", label: "Caja / Facturación", icon: <Wallet2 size={20} /> },
  { path: "/configuracion", label: "Configuración", icon: <GearFill size={20} /> },
];

// --- COMPONENTE NAVITEM ---
const NavItem = ({ path, label, icon, isLogout, onClick, theme, isActive, onMobileClose }) => {
  const baseStyle = {
    color: isLogout ? "#ff6b6b" : (isActive ? (theme.activeText || '#fff') : theme.sidebarText),
    backgroundColor: isActive && !isLogout ? theme.activeItem : "transparent",
    opacity: isActive || isLogout ? 1 : 0.85,
    borderRadius: "12px",
    padding: "12px 16px",
    margin: "4px 0",
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    fontWeight: isActive ? "600" : "500",
    transition: "all 0.2s ease-in-out",
    cursor: "pointer",
    border: isActive ? `1px solid ${theme.activeItem}` : "1px solid transparent"
  };

  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (onMobileClose) onMobileClose();
  };

  if (isLogout || !path) {
    return (
      <div onClick={handleClick} style={baseStyle} className="sidebar-link">
        <span className="me-3 d-flex align-items-center">{icon}</span>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Link to={path} onClick={handleClick} style={baseStyle} className="sidebar-link">
      <span className="me-3 d-flex align-items-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

// --- COMPONENTE CONTENIDO DEL SIDEBAR ---
const SidebarContent = ({ theme, logout, currentPath, onMobileClose }) => {
  return (
    <div className="d-flex flex-column h-100 p-3">
      {/* HEADER LOGO */}
      <div className="d-flex align-items-center mb-4 px-2">
        <img
          src={logoFull}
          alt="CloudTurn Logo"
          style={{ width: '40px', height: 'auto', marginRight: '12px' }}
        />
        <span className="fs-5 fw-bold" style={{ color: theme.sidebarText }}>CloudTurn</span>
      </div>

      <hr style={{ borderColor: theme.sidebarText, opacity: 0.15, margin: "0 0 1rem 0" }} />

      {/* NAVIGATION */}
      <Nav className="flex-column flex-grow-1">
        {NAV_LINKS.map((link) => (
          <NavItem
            key={link.path}
            {...link}
            theme={theme}
            isActive={currentPath === link.path}
            onMobileClose={onMobileClose}
          />
        ))}
      </Nav>

      <hr style={{ borderColor: theme.sidebarText, opacity: 0.15 }} />

      {/* FOOTER / LOGOUT */}
      <div className="mt-auto">
        <NavItem
          path="#"
          label="Cerrar Sesión"
          icon={<BoxArrowLeft size={20} />}
          isLogout
          onClick={logout}
          theme={theme}
          onMobileClose={onMobileClose}
        />
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const { theme } = useTheme();

  const [showMobile, setShowMobile] = useState(false);

  const handleClose = () => setShowMobile(false);
  const handleShow = () => setShowMobile(true);

  const isMobile = window.innerWidth < 768;

  return (
    <>
      {/* 1. BARRA SUPERIOR MÓVIL */}
      <div className="d-md-none w-100 mb-3">
        <Navbar expand={false} style={{ backgroundColor: theme.sidebarBg }} variant="dark">
          <Container fluid>
            <Navbar.Brand href="#" className="d-flex align-items-center">
              <img src={logoFull} alt="Logo" style={{ height: '30px', marginRight: '10px' }} />
              <span style={{ color: theme.sidebarText, fontSize: '1.2rem', fontWeight: 'bold' }}>CloudTurn</span>
            </Navbar.Brand>
            <Button
              variant="link"
              onClick={handleShow}
              style={{ color: theme.sidebarText, padding: 0 }}
            >
              <List size={30} />
            </Button>
          </Container>
        </Navbar>

        {/* Offcanvas Móvil */}
        <Offcanvas
          show={showMobile}
          onHide={handleClose}
          responsive="md"
          style={{ backgroundColor: theme.sidebarBg, color: theme.sidebarText, width: '280px' }}
        >
          <Offcanvas.Header closeButton closeVariant="white">
            <Offcanvas.Title>Menú</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-0">
            <SidebarContent
              theme={theme}
              logout={logout}
              currentPath={location.pathname}
              onMobileClose={handleClose}
            />
          </Offcanvas.Body>
        </Offcanvas>
      </div>

      {/* 2. SIDEBAR ESCRITORIO (Visible solo en d-md-flex) */}
      <div
        className="d-none d-md-flex flex-column"
        style={{
          width: "260px",
          minWidth: "260px",
          height: "100vh",
          position: "sticky",
          top: 0,
          backgroundColor: theme.sidebarBg,
          borderRight: "1px solid rgba(0,0,0,0.05)"
        }}
      >
        <SidebarContent
          theme={theme}
          logout={logout}
          currentPath={location.pathname}
          onMobileClose={null}
        />
      </div>

      <style>{`
        .sidebar-link:hover {
          filter: brightness(1.1);
          transform: translateX(4px);
        }
      `}</style>
    </>
  );
}