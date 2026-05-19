import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/ui/Button";
import { InputField } from "../../shared/components/ui/Field";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../features/auth/AuthProvider";
import { AuthLayout } from "./AuthLayout";

export function RegisterPage() {
  const { notify } = useToast();
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const message = await register(name, email, password);
      notify(message, "success");
      navigate("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đăng ký.";
      notify(message, "error");
    }
  };

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Dành cho chủ spa và đội ngũ vận hành">
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <InputField
          label="Họ và tên"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <InputField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <InputField
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="Ít nhất 8 ký tự"
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Đăng ký"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-subtext">
        Đã có tài khoản?{" "}
        <Link to="/login" className="font-semibold text-primary hover:text-primaryStrong">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  );
}

