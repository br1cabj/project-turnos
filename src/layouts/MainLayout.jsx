import React from "react";
import { Container } from "react-bootstrap";
import Sidebar from "../components/Sidebar";
import { useTheme } from '../contexts/ThemeContext';

export default function MainLayout({ children }) {
  const { theme } = useTheme();

  return (
    // CONTENEDOR PRINCIPAL
    <div
      className="d-flex flex-column flex-md-row"
      style={{
        height: "100vh",
        overflow: "hidden",
        backgroundColor: theme.mainBg || "#f8f9fa"
      }}
    >

      {/* 1. SIDEBAR */}
      <Sidebar />

      {/* 2. ÁREA DE CONTENIDO */}
      <main
        className="flex-grow-1 d-flex flex-column"
        style={{
          height: "100%",
          overflow: "hidden",
          position: "relative"
        }}
      >
        <div
          className="w-100 h-100 overflow-auto"
          style={{
            scrollBehavior: "smooth"
          }}
        >
          <Container
            fluid
            className="p-4"
            style={{
              maxWidth: "1600px",
              margin: "0 auto",
              minHeight: "100%"
            }}
          >

            <div className="fade-in-up">
              {children}
            </div>
          </Container>
        </div>
      </main>

      <style>{`
        /* Scrollbar personalizado sutil para Chrome/Safari/Edge */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent; 
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e0; 
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a0aec0; 
        }

        /* Animación de entrada */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
          animation: fadeInUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}