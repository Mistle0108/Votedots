import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import CanvasPage from "@/pages/CanvasPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/canvas" element={<CanvasPage />} />
    </Routes>
  );
}
