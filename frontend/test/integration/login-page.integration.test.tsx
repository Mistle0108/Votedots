import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http } from "msw/core/http";
import { Route, Routes } from "react-router-dom";
import LoginPage from "@/pages/login/LoginPage";
import { server } from "../setup/msw/server";
import { renderWithProviders } from "../setup/render-with-providers";

vi.mock("@/features/login-board", () => ({
  LoginBoardPanel: () => <div data-testid="login-board-panel" />,
}));

describe("LoginPage integration", () => {
  it("submits credentials and navigates to /play on success", async () => {
    server.use(
      http.post("http://localhost:4000/auth/login", async () =>
        Response.json({ message: "ok" }),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/play" element={<div>play-page</div>} />
      </Routes>,
      { route: "/login", locale: "en" },
    );

    const usernameInput = screen.getAllByRole("textbox")[0];
    const passwordInput = document.querySelector<HTMLInputElement>(
      'input[type="password"]',
    );

    if (!passwordInput) {
      throw new Error("Password input was not rendered.");
    }

    fireEvent.change(usernameInput, {
      target: { value: "tester01" },
    });
    fireEvent.change(passwordInput, {
      target: { value: "password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("play-page")).toBeInTheDocument();
  });

  it("shows a translated server error on failed login", async () => {
    server.use(
      http.post("http://localhost:4000/auth/login", async () =>
        Response.json(
          { message: "AUTH_INVALID_CREDENTIALS" },
          { status: 401 },
        ),
      ),
    );

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login", locale: "en" },
    );

    const usernameInput = screen.getAllByRole("textbox")[0];
    const passwordInput = document.querySelector<HTMLInputElement>(
      'input[type="password"]',
    );

    if (!passwordInput) {
      throw new Error("Password input was not rendered.");
    }

    fireEvent.change(usernameInput, {
      target: { value: "tester01" },
    });
    fireEvent.change(passwordInput, {
      target: { value: "wrongpass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(
        screen.getByText("Your username or password is incorrect."),
      ).toBeInTheDocument();
    });
  });
});
