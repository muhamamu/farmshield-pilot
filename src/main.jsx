import React from "react";
import { createRoot } from "react-dom/client";
import { Router } from "./Router.jsx";
import {AuthProvider} from "./AuthContext.jsx";
import "./styles.css";
import "./accounts.css";
import "./motion.css";
import "./profile.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider><Router /></AuthProvider>
  </React.StrictMode>,
);
