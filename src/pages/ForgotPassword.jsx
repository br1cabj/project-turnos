import React, { useRef, useState } from "react";
import { Form, Button, Alert, Container, Row, Col } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

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
      setMessage("Revisa tu bandeja de entrada para cambiar la contraseña.");
    } catch (err) {
      console.error(err);
      setError("No se pudo restablecer la contraseña. Verifica el correo.");
    }

    setLoading(false);
  }

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <div className="w-100" style={{ maxWidth: "400px" }}>
        <h2 className="text-center mb-4">Restablecer Contraseña</h2>

        {error && <Alert variant="danger">{error}</Alert>}
        {message && <Alert variant="success">{message}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4" id="email">
            <Form.Label>Correo electrónico</Form.Label>
            <Form.Control type="email" ref={emailRef} required size="lg" />
          </Form.Group>

          <Button disabled={loading} className="w-100 btn-lg" type="submit">
            Enviar instrucciones
          </Button>
        </Form>

        <div className="w-100 text-center mt-3">
          <Link to="/login" className="text-decoration-none">Volver al inicio de sesión</Link>
        </div>
      </div>
    </Container>
  );
}