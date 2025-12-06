import React, { useRef, useState } from "react";
import { Form, Button, Alert, Container, Row, Col } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

import imagenFondo from '../assets/prueba.webp'


export default function Login() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await login(emailRef.current.value, passwordRef.current.value);
      navigate("/");
    } catch (error) {
      console.error(error);
      setError("Error al iniciar sesión. Verifica tus credenciales.");
    }
    setLoading(false);
  }

  return (
    <Container fluid className="p-0" style={{ height: "100vh", overflow: "hidden" }}>
      <Row className="h-100">

        {/* IZQUIERDA */}
        <Col md={5} lg={4} className="d-flex align-items-center justify-content-center bg-white">
          <div style={{ width: "100%", maxWidth: "400px", padding: "20px" }}>

            <h2 className="mb-4 fw-bold text-dark">Bienvenido</h2>
            <p className="text-muted mb-4">Ingresa a tu panel de gestión.</p>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" id="email">
                <Form.Label>Correo electrónico</Form.Label>
                <Form.Control type="email" ref={emailRef} required size="lg" />
              </Form.Group>

              <Form.Group className="mb-4" id="password">
                <Form.Label>Contraseña</Form.Label>
                <Form.Control type="password" ref={passwordRef} required size="lg" />
              </Form.Group>

              <Button disabled={loading} className="w-100 btn-lg mb-3" type="submit" variant="primary">
                Ingresar
              </Button>
            </Form>

            <div className="w-100 text-center mt-3">
              <Link to="/forgot-password" className="text-decoration-none text-primary fw-bold">
                ¿Primera vez aquí? / ¿Olvidaste tu clave?
              </Link>
              <div className="text-muted small mt-2">
                Genera tu contraseña haciendo clic arriba.
              </div>
            </div>
          </div>
        </Col>

        {/* DERECHA */}
        <Col md={7} lg={8} className="d-none d-md-block p-0 position-relative">
          <div style={{
            backgroundImage: `url(${imagenFondo})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            height: "100%",
            width: "100%"
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              backgroundColor: "rgba(0,0,0,0.6)", // Un poco más oscuro para que se lea el texto
              display: "flex",
              flexDirection: "column",
              justifyContent: "center", // Centrado vertical
              padding: "60px"
            }}>
              <h1 className="text-white fw-bold display-4">CloudTurn</h1>
              <p className="text-white fs-4">Gestiona tu negocio de forma inteligente.</p>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
}