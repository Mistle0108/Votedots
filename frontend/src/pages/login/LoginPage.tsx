import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth";
import { LoginBoardPanel } from "@/features/login-board";
import { LOGIN_BOARD_THEME_STYLE } from "@/features/login-board/model/board-theme";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Button } from "@/shared/ui/button";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await authApi.login({ username, password });
      navigate("/play", { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response: { data: { message: string } } };
        setError(axiosErr.response.data.message);
      } else {
        setError("로그인 중 오류가 발생했어요.");
      }
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-white lg:h-screen lg:grid-cols-[minmax(0,2.6fr)_minmax(500px,1fr)] lg:overflow-hidden">
      <div
        className="min-h-0 overflow-y-auto border-b border-[color:var(--color-border-primary)] bg-[color:var(--color-background-primary)] lg:border-b-0 lg:border-r"
        style={LOGIN_BOARD_THEME_STYLE}
      >
        <LoginBoardPanel />
      </div>

      <div className="flex items-center justify-center px-6 py-10 lg:min-h-0 lg:overflow-hidden">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <BrandLogo variant="full" className="mx-auto w-85" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">아이디</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded border px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded border px-3 py-2 text-sm"
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full">
              로그인
            </Button>
          </form>

          <p className="text-center text-sm">
            계정이 없으신가요?{" "}
            <Link to="/register" className="underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
