import { Link } from "react-router-dom";
import {
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Gem,
  LineChart,
  LockKeyhole,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UsersRound,
  WandSparkles,
  Zap
} from "lucide-react";
import { useAuth } from "../features/auth/AuthProvider";
import { AppBrand } from "../shared/components/layout/AppBrand";
import { planOptions } from "../shared/constants/plans";

function planActionLink(planId: string, isLoggedIn: boolean): string {
  if (!isLoggedIn) return "/register";
  if (planId === "mien_phi") return "/app";
  return `/app?upgrade=${planId}`;
}

const featureCards = [
  {
    icon: WandSparkles,
    title: "Tạo nội dung bán dịch vụ",
    description: "Gợi ý tiêu đề, bài đăng, lời mời khách và hashtag theo phong cách spa của bạn."
  },
  {
    icon: UsersRound,
    title: "Theo dõi khách quan tâm",
    description: "Lưu lead, trạng thái tư vấn và bước tiếp theo để đội ngũ không bỏ sót khách."
  },
  {
    icon: CalendarCheck,
    title: "Nhắc việc rõ ràng",
    description: "Quản lý lịch gọi lại, chăm sóc khách cũ và duyệt thanh toán ngay trong dashboard."
  },
  {
    icon: Megaphone,
    title: "Chuẩn bị đăng bài",
    description: "Tách riêng nội dung, hình ảnh, lịch đăng và trạng thái để vận hành nhẹ hơn."
  }
];

const trustBadges = ["Dành cho spa Việt", "Dùng thử miễn phí", "Bảo vệ dữ liệu", "Nâng cấp linh hoạt"];

const dashboardStats = [
  { label: "Lead mới", value: "+38", note: "tuần này", tone: "text-primary" },
  { label: "Lịch hẹn", value: "24", note: "đang mở", tone: "text-warning" },
  { label: "Bài đã tạo", value: "126", note: "tháng này", tone: "text-success" }
];

const activityItems = [
  "Tạo bài ưu đãi chăm sóc da chuyên sâu",
  "Nhắc gọi lại khách quan tâm gói triệt lông",
  "Duyệt yêu cầu nâng cấp gói Tiết kiệm"
];

export function LandingPage() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  return (
    <div className="min-h-screen overflow-hidden text-text">
      <header className="sticky top-0 z-30 border-b border-white/20 bg-panel/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-4 py-3">
          <AppBrand logoClassName="h-10 max-w-[170px] sm:max-w-[210px]" />

          <nav className="hidden items-center gap-6 text-sm font-semibold text-subtext md:inline-flex">
            <a href="#features" className="transition hover:text-text">
              Tính năng
            </a>
            <a href="#analytics" className="transition hover:text-text">
              Báo cáo
            </a>
            <a href="#pricing" className="transition hover:text-text">
              Bảng giá
            </a>
          </nav>

          <div className="inline-flex items-center gap-2">
            {isLoggedIn ? (
              <Link
                to="/app"
                className="inline-flex min-h-10 items-center justify-center rounded-card bg-primary px-4 text-sm font-bold text-white shadow-soft transition hover:bg-primaryStrong"
              >
                Vào dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden min-h-10 items-center justify-center rounded-card border border-line bg-panel/70 px-4 text-sm font-bold text-text transition hover:bg-panelAlt sm:inline-flex"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="inline-flex min-h-10 items-center justify-center rounded-card bg-primary px-4 text-sm font-bold text-white shadow-soft transition hover:bg-primaryStrong"
                >
                  Dùng thử miễn phí
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section id="welcome" className="hero-spa-bg relative overflow-hidden">
          <div className="absolute inset-0 bg-slate-950/40" />
          <div className="relative mx-auto flex min-h-[86vh] w-full max-w-[1180px] flex-col justify-end gap-8 px-4 pb-8 pt-20 md:pb-10">
            <div className="max-w-[760px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold uppercase text-white shadow-soft backdrop-blur-xl">
                <Sparkles size={15} />
                EMS AI Marketing Spa
              </div>
              <h1 className="mt-5 max-w-[840px] text-4xl font-extrabold leading-tight text-white md:text-6xl">
                Dashboard marketing giúp spa tạo nội dung, giữ lead và tăng lịch hẹn mỗi ngày
              </h1>
              <p className="mt-5 max-w-[680px] text-base leading-7 text-white/90 md:text-lg">
                Một nơi để chủ spa xem tình hình, tạo bài đăng, chăm sóc khách và quản lý gói dịch vụ mà không cần rối với file hay bảng tính.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to={isLoggedIn ? "/app" : "/register"}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-card bg-white px-5 text-sm font-extrabold text-slate-950 shadow-soft transition hover:bg-slate-100"
                >
                  <Zap size={18} />
                  {isLoggedIn ? "Mở dashboard" : "Bắt đầu miễn phí"}
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-card border border-white/50 bg-white/10 px-5 text-sm font-extrabold text-white backdrop-blur-xl transition hover:bg-white/20"
                >
                  <Gem size={18} />
                  Xem gói phù hợp
                </a>
              </div>
            </div>

            <div id="analytics" className="grid gap-3 rounded-card border border-white/20 bg-white/10 p-3 shadow-soft backdrop-blur-xl md:grid-cols-[1.2fr,0.8fr] md:p-4">
              <div className="rounded-card border border-white/20 bg-slate-950/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">Tình hình spa hôm nay</p>
                    <p className="text-xs text-white/70">Cập nhật theo lead, lịch hẹn và nội dung đã tạo</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-emerald-100">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Đang hoạt động
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {dashboardStats.map((stat) => (
                    <article key={stat.label} className="rounded-card border border-white/20 bg-white/10 p-3">
                      <p className="text-xs font-semibold text-white/60">{stat.label}</p>
                      <p className={`mt-1 text-2xl font-extrabold ${stat.tone}`}>{stat.value}</p>
                      <p className="text-xs text-white/60">{stat.note}</p>
                    </article>
                  ))}
                </div>

                <div className="mt-5 rounded-card border border-white/20 bg-white/10 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="inline-flex items-center gap-2 text-sm font-bold text-white">
                      <LineChart size={17} />
                      Lịch hẹn theo ngày
                    </p>
                    <span className="text-xs font-semibold text-white/60">7 ngày gần nhất</span>
                  </div>
                  <div className="flex h-32 items-end gap-2">
                    <span className="h-[34%] flex-1 rounded-t-card bg-white/30" />
                    <span className="h-[52%] flex-1 rounded-t-card bg-primary/70" />
                    <span className="h-[46%] flex-1 rounded-t-card bg-white/40" />
                    <span className="h-[72%] flex-1 rounded-t-card bg-warning/80" />
                    <span className="h-[62%] flex-1 rounded-t-card bg-primary/80" />
                    <span className="h-[84%] flex-1 rounded-t-card bg-white/60" />
                    <span className="h-[95%] flex-1 rounded-t-card bg-success/80" />
                  </div>
                </div>
              </div>

              <aside className="grid gap-3">
                <article className="rounded-card border border-white/20 bg-white/10 p-4">
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-white">
                    <TrendingUp size={17} />
                    Việc cần xử lý
                  </p>
                  <div className="mt-3 grid gap-2">
                    {activityItems.map((item) => (
                      <p key={item} className="rounded-card border border-white/20 bg-slate-950/25 px-3 py-2 text-sm text-white/80">
                        {item}
                      </p>
                    ))}
                  </div>
                </article>
                <article className="rounded-card border border-white/20 bg-white/10 p-4">
                  <p className="text-sm font-bold text-white">Điểm mạnh tuần này</p>
                  <p className="mt-2 text-3xl font-extrabold text-white">+31%</p>
                  <p className="mt-1 text-sm text-white/70">Tỷ lệ khách phản hồi tốt hơn khi dùng mẫu trả lời nhanh.</p>
                </article>
              </aside>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1180px] gap-3 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {trustBadges.map((badge) => (
            <article key={badge} className="rounded-card border border-line/70 bg-panel/75 p-4 shadow-soft backdrop-blur-xl">
              <p className="inline-flex items-center gap-2 text-sm font-extrabold text-text">
                <ShieldCheck size={17} className="text-primary" />
                {badge}
              </p>
            </article>
          ))}
        </section>

        <section id="features" className="mx-auto w-full max-w-[1180px] px-4 py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-[680px]">
              <p className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-primary">
                <BarChart3 size={17} />
                Vận hành rõ ràng hơn
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-text md:text-4xl">Một dashboard nhìn là biết hôm nay cần làm gì</h2>
              <p className="mt-3 text-base leading-7 text-subtext">
                Giao diện được thiết kế cho chủ spa và nhân viên dùng mỗi ngày: ít chữ thừa, thao tác rõ, số liệu dễ quét.
              </p>
            </div>
            <div className="rounded-card border border-line bg-panel/80 px-4 py-3 shadow-soft backdrop-blur-xl">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-text">
                <Clock3 size={17} className="text-warning" />
                Tiết kiệm thời gian mỗi ca làm
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-card border border-line bg-panel/80 p-5 shadow-soft backdrop-blur-xl">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-primary/10 text-primary">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold text-text">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-subtext">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1180px] gap-4 px-4 py-10 lg:grid-cols-[0.92fr,1.08fr]">
          <div className="rounded-card border border-line bg-panel/80 p-6 shadow-soft backdrop-blur-xl">
            <p className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-primary">
              <Star size={17} />
              Vì sao khách sẽ tin hơn
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-text">Không chỉ là AI viết bài, mà là bộ điều khiển marketing cho spa</h2>
            <p className="mt-3 text-base leading-7 text-subtext">
              Khách hàng nhìn thấy một hệ thống có quy trình: có nội dung, có lead, có việc cần làm, có báo cáo và có phân quyền rõ ràng.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Theo dõi số lượt tạo nội dung theo gói",
              "Lưu lịch sử bài đã tạo để dùng lại",
              "Tách task admin khỏi task khách hàng",
              "Có chế độ sáng tối cho người dùng"
            ].map((item) => (
              <article key={item} className="rounded-card border border-line bg-panel/80 p-4 shadow-soft backdrop-blur-xl">
                <p className="inline-flex items-start gap-2 text-sm font-bold leading-6 text-text">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                  {item}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-[1180px] px-4 py-12">
          <div className="mb-6 text-center">
            <p className="text-sm font-extrabold uppercase tracking-wide text-primary">Bảng giá</p>
            <h2 className="mt-2 text-3xl font-extrabold text-text md:text-4xl">Chọn gói theo tốc độ phát triển của spa</h2>
            <p className="mx-auto mt-3 max-w-[620px] text-sm leading-6 text-subtext">
              Bắt đầu nhỏ để có dòng tiền trước, sau đó nâng cấp khi đội ngũ cần nhiều lead và nhiều lượt tạo nội dung hơn.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {planOptions.map((plan) => {
              const isFeatured = plan.id === "cao_cap";
              return (
                <article
                  key={plan.id}
                  className={`relative rounded-card border bg-panel/80 p-5 shadow-soft backdrop-blur-xl ${
                    isFeatured ? "border-primary ring-2 ring-primary/20" : "border-line"
                  }`}
                >
                  {isFeatured ? (
                    <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
                      Phổ biến
                    </span>
                  ) : null}
                  <p className="text-sm font-extrabold text-subtext">{plan.title}</p>
                  <p className="mt-2 text-3xl font-extrabold text-text">{plan.price}</p>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-subtext">{plan.description}</p>
                  <div className="mt-4 grid gap-2 rounded-card border border-line/70 bg-panelAlt/60 p-3">
                    <p className="text-sm font-bold text-text">{plan.leadLimit}</p>
                    <p className="text-sm font-bold text-text">{plan.aiLimit}</p>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {plan.features.map((feature) => (
                      <p key={feature} className="inline-flex items-start gap-2 text-sm leading-6 text-subtext">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                        {feature}
                      </p>
                    ))}
                  </div>
                  <Link
                    to={planActionLink(plan.id, isLoggedIn)}
                    className={`mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-card px-4 text-sm font-extrabold transition ${
                      isFeatured
                        ? "bg-primary text-white shadow-soft hover:bg-primaryStrong"
                        : "border border-line bg-panel text-text hover:bg-panelAlt"
                    }`}
                  >
                    {isLoggedIn && plan.id !== "mien_phi" ? `Mua gói ${plan.title}` : `Dùng gói ${plan.title}`}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1180px] px-4 pb-16">
          <div className="rounded-card border border-line bg-panel/80 p-6 text-center shadow-soft backdrop-blur-xl md:p-8">
            <LockKeyhole className="mx-auto text-primary" size={28} />
            <h2 className="mt-3 text-2xl font-extrabold text-text">Sẵn sàng làm sản phẩm nhìn đáng tin hơn</h2>
            <p className="mx-auto mt-2 max-w-[620px] text-sm leading-6 text-subtext">
              Giao diện mới tập trung vào cảm giác chuyên nghiệp, dễ hiểu và có lý do rõ ràng để khách hàng muốn thử.
            </p>
            <Link
              to={isLoggedIn ? "/app" : "/register"}
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-card bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primaryStrong"
            >
              {isLoggedIn ? "Đi tới dashboard" : "Tạo tài khoản miễn phí"}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
