import React from "react";
import { Nav } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarWeek,
  PeopleFill,
  Wallet2,
  GearFill,
  BoxArrowLeft
} from "react-bootstrap-icons";
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const { theme } = useTheme()

  const isActive = (path) => location.pathname === path;

  const navLinkStyle = (path) => {
    const active = isActive(path);
    return {
      backgroundColor: active ? theme.activeItem : "transparent",
      color: active
        ? (theme.activeText || '#fff')
        : theme.sidebarText,
      opacity: active ? 1 : 0.8,
      borderRadius: "8px",
      padding: "10px 15px",
      marginBottom: "5px",
      display: "flex",
      alignItems: "center",
      textDecoration: "none",
      fontWeight: active ? "600" : "400",
      transition: "all 0.2s ease"
    };
  };

  return (

    <div className="d-flex flex-column p-3" style={{ height: "100%", width: "100%", minWidth: "250px", backgroundColor: theme.sidebarBg, color: theme.sidebarText }}>

      <div className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none px-2">
        <span className="fs-4 fw-bold" style={{ color: theme.sidebarText }}>CloudTurn</span>
      </div>

      <hr style={{ borderColor: theme.sidebarText, opacity: 0.2 }} />

      {/* NAVBAR */}
      <Nav className="flex-column mb-auto">
        <Link to="/" style={navLinkStyle("/")}>
          <CalendarWeek className="me-2" size={20} />
          Agenda
        </Link>

        <Link to="/clientes" style={navLinkStyle("/clientes")}>
          <PeopleFill className="me-2" size={20} />
          Clientes
        </Link>

        <Link to="/caja" style={navLinkStyle("/caja")}>
          <Wallet2 className="me-2" size={20} />
          Caja / Facturación
        </Link>

        <Link to="/configuracion" style={navLinkStyle("/configuracion")}>
          <GearFill className="me-2" size={20} />
          Configuración
        </Link>
      </Nav>

      <hr style={{ borderColor: theme.sidebarText, opacity: 0.2 }} />

      {/* USUARIO Y LOGOUT */}
      <div className="mt-auto">
        <div onClick={logout} style={{ ...navLinkStyle("#"), cursor: "pointer", color: "#ff6b6b" }}>
          <BoxArrowLeft className="me-2" size={20} />
          Cerrar Sesión
        </div>
      </div>
    </div>
  );
}