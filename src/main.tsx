import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";
import { AuthProvider } from "./features/auth/AuthProvider";

const rootElement = document.getElementById("root");

if (rootElement) {
  try {
    ReactDOM.createRoot(rootElement).render(
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    );
  } catch (err) {
    console.error("Critical Render Error:", err);
    rootElement.innerHTML = `
      <div style="padding: 24px; font-family: sans-serif; text-align: center;">
        <h1 style="color: #31470b;">Error de Inicio</h1>
        <p>Hubo un problema al cargar la aplicación. Por favor, verifica la consola para detalles.</p>
        <button onclick="window.location.reload()" style="background: #31470b; color: white; border: none; padding: 10px 20px; border-radius: 8px;">Reintentar</button>
      </div>
    `;
  }
}
