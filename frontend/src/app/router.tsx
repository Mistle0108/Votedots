import { Navigate, createBrowserRouter } from "react-router-dom";
import CanvasPage from "@/pages/canvas/CanvasPage";
import LoginPage from "@/pages/login/LoginPage";
import RegisterPage from "@/pages/register/RegisterPage";

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
    path: "/play",
    element: <CanvasPage />,
  },
]);
