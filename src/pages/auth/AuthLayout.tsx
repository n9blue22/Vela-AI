import { Link } from "react-router-dom";
import { PropsWithChildren } from "react";

interface AuthLayoutProps extends PropsWithChildren {
  title: string;
  subtitle: string;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg lg:grid-cols-[1.1fr,0.9fr]">
      <section className="hero-spa-bg relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-slate-900/35" />
        <div className="absolute bottom-10 left-10 z-10 max-w-[520px] text-white">
          <p className="text-sm font-semibold uppercase tracking-wide">Spa AI Studio</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight">Vận hành spa thông minh và chốt lịch nhanh hơn</h1>
          <p className="mt-3 text-sm text-white/85">
            Hệ thống dành cho chủ spa và đội ngũ tư vấn: quản lý lead, nội dung AI, task vận hành và quyền admin trên cùng một nền
            tảng.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px] rounded-card border border-line bg-panel p-5 shadow-soft">
          <div className="mb-4">
            <Link to="/" className="text-sm font-semibold text-primary hover:text-primaryStrong">
              Trang chủ
            </Link>
            <h2 className="mt-2 text-2xl font-extrabold text-text">{title}</h2>
            <p className="text-sm text-subtext">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}

