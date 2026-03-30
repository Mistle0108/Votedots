import { Navigate, createBrowserRouter } from "react-router-dom";
import CanvasPage from "@/features/gameplay/pages/CanvasPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/canvas",
    element: <CanvasPage />,
  },
]);
