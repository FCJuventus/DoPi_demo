// frontend/src/App.tsx
import React from "react";
import "./defaults.css";
import "./i18n";
import JobsApp from "./Jobs";

export default function App() {
  return <JobsApp />; // Header уже внутри JobsApp
}
