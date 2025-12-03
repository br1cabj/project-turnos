import React, { useRef, useState } from "react";
import { Form, Button, Alert, Container, Row, Col } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const passwordConfirmRef = useRef();
  const { signup } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (passwordRef.current.value !== passwordConfirmRef.current.value) {
      return setError('La contraseña no coincide');
    }

    try {
      setError("");
      setLoading(true);
      await signup(emailRef.current.value, passwordRef.current.value);
      navigate("/");

    } catch (error) {
      console.error(error)
      setError('Error al crear la cuenta')
    }

    setLoading(false)
  }

  return (
    // container-fluid y p-0 para ocupar toda la pantalla sin bordes blancos
    <Container fluid className="p-0" style={{ height: "100vh", overflow: "hidden" }}>
      <Row className="h-100">

        {/* SECCION IZQUIERDA */}
        <Col md={5} lg={4} className="d-flex align-items-center justify-content-center bg-white">
          <div style={{ width: "100%", maxWidth: "400px", padding: "20px" }}>

            {/* Encabezado limpio */}
            <h2 className="mb-4 fw-bold text-dark">Empieza gratis</h2>
            <p className="text-muted mb-4">
              Gestiona turnos de tu negocio de manera inteligente.
            </p>

            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" id="email">
                <Form.Label>Correo electrónico</Form.Label>
                <Form.Control type="email" ref={emailRef} required size="lg" />
              </Form.Group>

              <Form.Group className="mb-3" id="password">
                <Form.Label>Contraseña</Form.Label>
                <Form.Control type="password" ref={passwordRef} required size="lg" />
              </Form.Group>

              <Form.Group className="mb-4" id="password-confirm">
                <Form.Label>Confirmar contraseña</Form.Label>
                <Form.Control type="password" ref={passwordConfirmRef} required size="lg" />
              </Form.Group>

              <Button disabled={loading} className="w-100 btn-lg mb-3" type="submit" variant="primary">
                Crear cuenta
              </Button>
            </Form>

            <div className="w-100 text-center mt-3 text-muted">
              ¿Ya tienes cuenta? <Link to="/login" className="text-decoration-none fw-bold">Inicia sesión</Link>
            </div>
          </div>
        </Col>

        {/* SECCIÓN DERECHA */}
        <Col md={7} lg={8} className="d-none d-md-block p-0 position-relative">

          <div style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2671&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            height: "100%",
            width: "100%"
          }}>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "flex-end",
              padding: "50px"
            }}>
              <div className="text-white">
                <h3 className="fw-bold display-6">Potencia tu negocio</h3>
                <p className="lead">Únete a miles de profesionales que ya gestionan sus turnos con nosotros.</p>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
