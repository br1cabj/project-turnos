import React, { useRef, useState } from "react";
import { Form, Button, Alert, Container, Row, Col } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { ArrowLeft } from "react-bootstrap-icons";

// Usamos la misma imagen o una variante
import imagenFondo from '../assets/prueba.webp'

export default function ForgotPassword() {
  const emailRef = useRef();
  const { resetPassword } = useAuth();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setMessage("");
      setError("");
      setLoading(true);
      await resetPassword(emailRef.current.value);
      setMessage("✅ ¡Listo! Revisa tu correo (y la carpeta spam) para crear tu nueva contraseña.");
    } catch (err) {
      console.error(err);
      // Mensajes de error más amigables
      if (err.code === 'auth/user-not-found') {
        setError("No encontramos ninguna cuenta con ese correo.");
      } else {
        setError("No se pudo enviar el correo. Intenta nuevamente.");
      }
    }

    setLoading(false);
  }

  return (
    <Container fluid className="p-0" style={{ height: "100vh", overflow: "hidden" }}>
      <Row className="h-100">

        {/* IZQUIERDA: FORMULARIO */}
        <Col md={5} lg={4} className="d-flex align-items-center justify-content-center bg-white">
          <div style={{ width: "100%", maxWidth: "400px", padding: "20px" }}>

            <div className="mb-4">
              <h2 className="fw-bold text-dark">Recuperar Acceso</h2>
              <p className="text-muted">
                Ingresa tu correo para generar o restablecer tu contraseña.
              </p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-4" id="email">
                <Form.Label>Correo electrónico</Form.Label>
                <Form.Control
                  type="email"
                  ref={emailRef}
                  required
                  size="lg"
                  placeholder="ejemplo@email.com"
                />
              </Form.Group>

              <Button disabled={loading} className="w-100 btn-lg mb-3" type="submit" variant="primary">
                {loading ? "Enviando..." : "Enviar Link de Recuperación"}
              </Button>
            </Form>

            <div className="w-100 text-center mt-3">
              <Link to="/login" className="text-decoration-none text-muted d-flex align-items-center justify-content-center gap-2">
                <ArrowLeft /> Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </Col>

        {/* DERECHA: IMAGEN (Igual que en Login para consistencia) */}
        <Col md={7} lg={8} className="d-none d-md-block p-0 position-relative">
          <div style={{
            backgroundImage: `url(${imagenFondo})`,
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
              backgroundColor: "rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "60px"
            }}>
              <h1 className="text-white fw-bold display-4">¿Primera vez?</h1>
              <p className="text-white fs-4">Activa tu cuenta fácilmente ingresando tu correo.</p>
            </div>
          </div>
        </Col>

      </Row>
    </Container>
  );
}