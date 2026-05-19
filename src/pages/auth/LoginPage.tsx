import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/ui/Button";
import { InputField } from "../../shared/components/ui/Field";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../features/auth/AuthProvider";
import { AuthLayout } from "./AuthLayout";

export function LoginPage() {
  const { notify } = useToast();
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const redirectTo = (location.state as { from?: string } | undefined)?.from ?? "/app";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await login(email, password);
      notify("Đăng nhập thành công.", "success");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đăng nhập.";
      notify(message, "error");
    }
  };

  return (
    <AuthLayout title="Đăng nhập" subtitle="Đăng nhập để quản lý spa bằng AI">
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <InputField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
        <InputField
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link to="/forgot-password" className="font-semibold text-primary hover:text-primaryStrong">
          Quên mật khẩu
        </Link>
        <Link to="/register" className="font-semibold text-primary hover:text-primaryStrong">
          Tạo tài khoản mới
        </Link>
      </div>
    </AuthLayout>
  );
}

