import { Link } from "react-router-dom";
import { CheckCircle2, Sparkles, TimerReset, UsersRound } from "lucide-react";
import { useAuth } from "../features/auth/AuthProvider";
import { planOptions } from "../shared/constants/plans";

function planActionLink(planId: string, isLoggedIn: boolean): string {
  if (!isLoggedIn) return "/register";
  if (planId === "mien_phi") return "/app";
  return `/app?upgrade=${planId}`;
}

export function LandingPage() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  return (
    <div className="min-h-screen text-text">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-panel/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-4 py-3">
          <div className="inline-flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-card bg-primary text-white">
              <Sparkles size={16} />
            </div>
            <p className="text-sm font-extrabold">Spa AI Studio</p>
          </div>

          <nav className="hidden items-center gap-5 text-sm font-semibold text-subtext md:inline-flex">
            <a href="#welcome" className="hover:text-text">
              Chào mừng
            </a>
            <a href="#about" className="hover:text-text">
              Về chúng tôi
            </a>
            <a href="#pricing" className="hover:text-text">
              Bảng giá
            </a>
          </nav>

          <div className="inline-flex items-center gap-2">
            {isLoggedIn ? (
              <Link
                to="/app"
                className="inline-flex min-h-10 items-center justify-center rounded-card bg-primary px-3 text-sm font-semibold text-white hover:bg-primaryStrong"
              >
                Vào dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex min-h-10 items-center justify-center rounded-card border border-line bg-panel px-3 text-sm font-semibold text-text hover:bg-panelAlt"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="inline-flex min-h-10 items-center justify-center rounded-card bg-primary px-3 text-sm font-semibold text-white hover:bg-primaryStrong"
                >
                  Tạo tài khoản
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section id="welcome" className="hero-spa-bg relative min-h-[78vh] overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1180px] items-end px-4 pb-14 pt-16">
          <div className="max-w-[640px]">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/85">Nền tảng Marketing AI cho Spa Việt Nam</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight text-white md:text-5xl">
              Chào mừng bạn đến với hệ thống giúp spa chốt khách dễ hơn mỗi ngày
            </h1>
            <p className="mt-4 text-base text-white/85">
              Tạo nội dung nhanh, quản lý lead rõ ràng, theo dõi công việc theo ca vận hành và mở rộng bằng admin panel mà không cần
              đụng code.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={isLoggedIn ? "/app" : "/register"}
                className="inline-flex min-h-11 items-center justify-center rounded-card bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-200"
              >
                {isLoggedIn ? "Vào ứng dụng" : "Bắt đầu miễn phí"}
              </Link>
              <a
                href="#pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-card border border-white/70 px-4 text-sm font-bold text-white hover:bg-white/15"
              >
                Xem bảng giá
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto grid w-full max-w-[1180px] gap-4 px-4 py-12 md:grid-cols-3">
        <article className="rounded-card border border-line bg-panel p-4">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-text">
            <UsersRound size={16} />
            Về chúng tôi
          </p>
          <p className="mt-2 text-sm text-subtext">
            Chúng tôi xây sản phẩm cho chủ spa bận rộn: thao tác ít, ra kết quả nhanh, dễ bàn giao cho đội ngũ.
          </p>
        </article>
        <article className="rounded-card border border-line bg-panel p-4">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-text">
            <TimerReset size={16} />
            Quy trình đơn giản
          </p>
          <p className="mt-2 text-sm text-subtext">3 bước hằng ngày: tạo bài, phản hồi khách, cập nhật trạng thái lead.</p>
        </article>
        <article className="rounded-card border border-line bg-panel p-4">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-text">
            <CheckCircle2 size={16} />
            Tập trung hiệu quả
          </p>
          <p className="mt-2 text-sm text-subtext">Mọi tính năng đều xoay quanh mục tiêu tăng lịch hẹn và doanh thu bền vững.</p>
        </article>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-[1180px] px-4 pb-16">
        <div className="mb-4">
          <h2 className="text-2xl font-extrabold">Bảng Giá</h2>
          <p className="text-sm text-subtext">Phân tầng theo giới hạn lead và số lượt AI mỗi ngày.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {planOptions.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-card border bg-panel p-4 ${
                plan.id === "cao_cap" ? "border-primary shadow-soft" : "border-line"
              }`}
            >
              <p className="text-sm font-semibold text-subtext">{plan.title}</p>
              <p className="mt-1 text-2xl font-extrabold text-text">{plan.price}</p>
              <p className="mt-2 text-sm text-subtext">{plan.description}</p>
              <p className="mt-3 text-sm font-semibold text-text">{plan.leadLimit}</p>
              <p className="text-sm font-semibold text-text">{plan.aiLimit}</p>
              <div className="mt-3 grid gap-2">
                {plan.features.map((feature) => (
                  <p key={feature} className="inline-flex items-center gap-2 text-sm text-subtext">
                    <CheckCircle2 size={14} className="text-primary" />
                    {feature}
                  </p>
                ))}
              </div>
              <Link
                to={planActionLink(plan.id, isLoggedIn)}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-card bg-primary px-4 text-sm font-bold text-white hover:bg-primaryStrong"
              >
                {isLoggedIn && plan.id !== "mien_phi" ? `Mua gói ${plan.title}` : `Dùng gói ${plan.title}`}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
