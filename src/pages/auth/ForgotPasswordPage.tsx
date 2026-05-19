import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Copy } from "lucide-react";
import { Button } from "../../shared/components/ui/Button";
import { InputField } from "../../shared/components/ui/Field";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../features/auth/AuthProvider";
import { AuthLayout } from "./AuthLayout";

export function ForgotPasswordPage() {
  const { notify } = useToast();
  const { forgotPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const data = await forgotPassword(email);
      notify(data.message, "success");
      setResetUrl(data.resetUrl || "");
      setResetToken(data.resetToken || "");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tạo liên kết đặt lại mật khẩu.";
      notify(message, "error");
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify("Đã sao chép.", "success");
    } catch (error) {
      console.error(error);
      notify("Không thể sao chép.", "error");
    }
  };

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập email để tạo liên kết đặt lại mật khẩu (không cần SMTP)">
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <InputField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Đang tạo..." : "Tạo liên kết"}
        </Button>
      </form>

      {resetUrl ? (
        <div className="mt-4 grid gap-2 rounded-card border border-line bg-panelAlt p-3">
          <p className="text-sm font-semibold text-text">Liên kết đặt lại mật khẩu</p>
          <a href={resetUrl} className="break-all text-sm font-semibold text-primary hover:text-primaryStrong">
            {resetUrl}
          </a>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => copy(resetUrl)}>
              <Copy size={15} />
              Copy link
            </Button>
            {resetToken ? (
              <Button variant="secondary" onClick={() => copy(resetToken)}>
                <Copy size={15} />
                Copy token
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-sm text-subtext">
        <Link to="/login" className="font-semibold text-primary hover:text-primaryStrong">
          Quay lại đăng nhập
        </Link>
      </p>
    </AuthLayout>
  );
}
