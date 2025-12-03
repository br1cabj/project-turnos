import React from "react";
import Sidebar from "../components/Sidebar";
import { Container } from "react-bootstrap";

export default function MainLayout({ children }) {
  return (
    <div className="d-flex" style={{ height: "100vh", overflow: "hidden" }}>
      <div className="d-none d-md-block">
        <Sidebar />
      </div>

      {/* 2. El área de contenido principal */}
      <div className="flex-grow-1 d-flex flex-column" style={{ backgroundColor: "#f3f4f6" }}>

        {/* TOPBAR */}

        {/* Contenido dinamico */}
        <div className="overflow-auto p-4" style={{ height: "100%" }}>
          <Container fluid>
            {children}
          </Container>
        </div>
      </div>
    </div>
  );
}