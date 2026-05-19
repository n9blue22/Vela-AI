import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./app/AppRouter";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ToastProvider } from "./hooks/useToast";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);
