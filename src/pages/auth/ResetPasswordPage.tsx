import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../shared/components/ui/Button";
import { InputField } from "../../shared/components/ui/Field";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../features/auth/AuthProvider";
import { AuthLayout } from "./AuthLayout";

export function ResetPasswordPage() {
  const { notify } = useToast();
  const { resetPassword, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");

  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !token) {
      notify("Thiếu token hoặc email trong đường dẫn.", "error");
      return;
    }

    try {
      const message = await resetPassword(email, token, password);
      notify(message, "success");
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đặt lại mật khẩu.";
      notify(message, "error");
    }
  };

  return (
    <AuthLayout title="Đặt lại mật khẩu" subtitle="Tạo mật khẩu mới để đăng nhập lại">
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <InputField label="Email" value={email} disabled />
        <InputField
          label="Mật khẩu mới"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-subtext">
        <Link to="/login" className="font-semibold text-primary hover:text-primaryStrong">
          Quay lại đăng nhập
        </Link>
      </p>
    </AuthLayout>
  );
}

