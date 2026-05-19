import { Navigate, createBrowserRouter } from "react-router-dom";
import StaticInfoPage from "@/pages/info/StaticInfoPage";
import LocaleRedirectPage from "@/pages/landing/LocaleRedirectPage";
import LandingPage from "@/pages/landing/LandingPage";
import PublicUpdatesPage from "@/pages/landing/PublicUpdatesPage";
import LobbyPage from "@/pages/lobby/LobbyPage";
import LoginPage from "@/pages/login/LoginPage";
import MyPage from "@/pages/mypage/MyPage";
import PlazaPage from "@/pages/plaza/PlazaPage";
import RegisterPage from "@/pages/register/RegisterPage";
import RoomPage from "@/pages/room/RoomPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LocaleRedirectPage />,
  },
  {
    path: "/ko",
    element: <LandingPage locale="ko" />,
  },
  {
    path: "/en",
    element: <LandingPage locale="en" />,
  },
  {
    path: "/ko/patches",
    element: <PublicUpdatesPage locale="ko" tab="patches" />,
  },
  {
    path: "/en/patches",
    element: <PublicUpdatesPage locale="en" tab="patches" />,
  },
  {
    path: "/ko/roadmap",
    element: <PublicUpdatesPage locale="ko" tab="roadmap" />,
  },
  {
    path: "/en/roadmap",
    element: <PublicUpdatesPage locale="en" tab="roadmap" />,
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
    element: <Navigate to="/plaza" replace />,
  },
  {
    path: "/plaza",
    element: <PlazaPage />,
  },
  {
    path: "/lobby",
    element: <LobbyPage />,
  },
  {
    path: "/room",
    element: <RoomPage />,
  },
  {
    path: "/mypage",
    element: <MyPage />,
  },
  {
    path: "/ko/terms",
    element: <StaticInfoPage locale="ko" pageKey="terms" />,
  },
  {
    path: "/en/terms",
    element: <StaticInfoPage locale="en" pageKey="terms" />,
  },
  {
    path: "/ko/privacy",
    element: <StaticInfoPage locale="ko" pageKey="privacy" />,
  },
  {
    path: "/en/privacy",
    element: <StaticInfoPage locale="en" pageKey="privacy" />,
  },
  {
    path: "/ko/community",
    element: <StaticInfoPage locale="ko" pageKey="community" />,
  },
  {
    path: "/en/community",
    element: <StaticInfoPage locale="en" pageKey="community" />,
  },
  {
    path: "/ko/contact",
    element: <StaticInfoPage locale="ko" pageKey="contact" />,
  },
  {
    path: "/en/contact",
    element: <StaticInfoPage locale="en" pageKey="contact" />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
