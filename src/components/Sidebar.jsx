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
import { useAuth } from "../contexts/AuthContext";
import { onBackgroundMessage } from "firebase/messaging/sw";

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth()

  const isActive = (path) => location.pathname === path;

  const navLinkStyle = (path) => ({
    color: isActive(path) ? "#fff" : "#B5BEC7",
    onBackgroundColor: isActive(path) ? "#FFF" : "transparent",
    borderRadius: "8px",
    padding: "10px 15px",
    marginBottom: "5px",
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    fontWeight: isActive(path) ? "600" : "400",
    transition: "all 0.3s ease"
  });

  return (
    <div className="d-flex flex-column p-3 text-white bg-dark" style={{ height: "100vh", width: "250px" }}>
      <div className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none px-2">
        <span className="fs-4 fw-bold">CloudTurn</span>
      </div>

      <hr />

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

      <hr />

      {/* USUARIO Y LOGOUT */}
      <div className="mt-auto">
        <div
          onClick={logout}
          style={{ ...navLinkStyle("#"), cursor: "pointer", color: "#ff6b6b" }}
        >
          <BoxArrowLeft className="me-2" size={20} />
          Cerrar Sesión
        </div>
      </div>
    </div>
  );
}