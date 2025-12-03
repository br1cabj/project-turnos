import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from '../config/firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";

const AuthContext = createContext()

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  //Funcion para registrarse
  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  //Funcion para iniciar sesion
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  //Funcion para cerrar sesion
  function logout() {
    return signOut(auth);
  }

  //Restart contraseña
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    })

    return unsubscribe
  }, [])

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
