import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute'

//--- PAGINAS ---
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Configuration from './pages/Configuration';
import Clients from './pages/Clients';
import CashRegister from './pages/CashRecorder';
import PublicBooking from './pages/PublicBooking';
import SuperAdmin from './pages/SuperAdmin';
import SubscriptionGuard from './components/SubscriptionGuard';
import RateService from './pages/RateService';
import { ThemeProvider } from './contexts/ThemeContext';



function App() {
  const SuperAdminRoute = ({ children }) => {
    const { currentUser } = useAuth();

    const ADMIN_EMAIL = "esquivelb136@gmail.com";

    if (currentUser?.email !== ADMIN_EMAIL) {
      return <h2>⛔ Acceso Denegado: No eres el Super Admin.</h2>;
    }
    return children;
  };

  return (

    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>

            {/* Ruta Protegida */}
            <Route path="/" element={
              <PrivateRoute>
                <SubscriptionGuard>
                  <Dashboard />
                </SubscriptionGuard>
              </PrivateRoute>
            } />
            <Route path="/configuracion" element={
              <PrivateRoute>
                <Configuration />
              </PrivateRoute>
            } />
            <Route path="/clientes" element={
              <PrivateRoute><Clients /></PrivateRoute>
            } />
            <Route path="/caja" element={
              <PrivateRoute><CashRegister /></PrivateRoute>
            } />
            <Route path="/super-admin" element={
              <PrivateRoute>
                <SuperAdminRoute>
                  <SuperAdmin />
                </SuperAdminRoute>
              </PrivateRoute>
            } />


            {/* Rutas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reservar/:slug" element={<PublicBooking />} />
            <Route path="/calificar/:apptId" element={<RateService />} />

          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter >
  );
}

export default App;