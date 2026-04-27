import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Button } from "@/shared/ui/button";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await authApi.register({ username, password, nickname });
      navigate("/login");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response: { data: { message: string } } };
        setError(axiosErr.response.data.message);
      } else {
        setError("회원가입 중 오류가 발생했어요.");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <BrandLogo variant="full" className="mx-auto w-60" />

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
            <label className="text-sm font-medium">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
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
            회원가입
          </Button>
        </form>

        <p className="text-center text-sm">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
