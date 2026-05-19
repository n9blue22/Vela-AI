import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  CheckCircle2,
  ClipboardList,
  Copy,
  Crown,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  MoonStar,
  PencilLine,
  Sparkles,
  SunMedium,
  Trash2,
  UsersRound
} from "lucide-react";
import { useAuth } from "../features/auth/AuthProvider";
import { UpgradePlanModal } from "../features/billing/UpgradePlanModal";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import { appService } from "../services/app.service";
import {
  PaidPlan,
  formatVnd,
  getPaymentQrImageUrl,
  getNextPaidPlan,
  getPlanPriceVnd,
  isPaidPlan
} from "../shared/constants/billing";
import { planLabel } from "../shared/constants/plans";
import { Badge } from "../shared/components/ui/Badge";
import { Button } from "../shared/components/ui/Button";
import { Card } from "../shared/components/ui/Card";
import { InputField, SelectField, TextAreaField } from "../shared/components/ui/Field";
import { Lead, TaskItem } from "../types";

type TabKey = "overview" | "content" | "leads" | "tasks";

const leadStatusOptions = [
  { id: "new", label: "Mới" },
  { id: "contacted", label: "Đã liên hệ" },
  { id: "negotiating", label: "Đang tư vấn" },
  { id: "won", label: "Đã chốt" },
  { id: "lost", label: "Tạm dừng" }
];

const taskStatusOptions = [
  { id: "todo", label: "Cần làm" },
  { id: "in_progress", label: "Đang làm" },
  { id: "done", label: "Hoàn thành" }
];

export function AppHomePage() {
  const { user, token, logout, refreshMe } = useAuth();
  const { theme, setTheme } = useTheme();
  const { notify } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(false);
  const [showUpdateBox, setShowUpdateBox] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<PaidPlan>("tiet_kiem");
  const [confirmingUpgrade, setConfirmingUpgrade] = useState(false);
  const [updateName, setUpdateName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [quota, setQuota] = useState({ used: 0, limit: 0, remaining: 0 });

  const [leadName, setLeadName] = useState("");
  const [leadSource, setLeadSource] = useState("Facebook");
  const [leadContact, setLeadContact] = useState("");
  const [leadNote, setLeadNote] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskType, setTaskType] = useState("marketing");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [pendingTaskAction, setPendingTaskAction] = useState<{ taskId: string; action: "done" | "delete" } | null>(
    null
  );
  const [taskActionLoadingId, setTaskActionLoadingId] = useState<string | null>(null);

  const [contentForm, setContentForm] = useState({
    channel: "facebook",
    goal: "Tăng lịch hẹn spa trong tuần",
    audience: "Khách nữ 24-40 tuổi, quan tâm chăm sóc da",
    productOrService: "Liệu trình chăm sóc da chuyên sâu",
    tone: "friendly",
    language: "vi",
    specialNote: "Có ưu đãi 20% cho khách lần đầu."
  });
  const [contentResult, setContentResult] = useState({
    headline: "",
    body: "",
    cta: "",
    replyTemplate: ""
  });
  const selectedPlanPrice = useMemo(() => getPlanPriceVnd(selectedUpgradePlan), [selectedUpgradePlan]);
  const transferContent = useMemo(() => {
    const accountCode = (user?.id || "KHACH").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
    return `DAI-${selectedUpgradePlan.toUpperCase()}-${accountCode}`;
  }, [selectedUpgradePlan, user?.id]);
  const vietQrImageUrl = useMemo(
    () => getPaymentQrImageUrl(selectedPlanPrice, transferContent),
    [selectedPlanPrice, transferContent]
  );

  const openCount = useMemo(
    () => leads.filter((lead) => lead.status !== "won" && lead.status !== "lost").length,
    [leads]
  );
  const wonCount = useMemo(() => leads.filter((lead) => lead.status === "won").length, [leads]);

  const reloadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadData, taskData, quotaData] = await Promise.all([
        appService.getLeads(token),
        appService.getTasks(token),
        appService.getQuota(token)
      ]);
      setLeads(leadData.leads);
      setTasks(taskData.tasks);
      setQuota({
        used: quotaData.used,
        limit: quotaData.limit,
        remaining: quotaData.remaining
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải dữ liệu.";
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify, token]);

  useEffect(() => {
    reloadData().catch(() => undefined);
  }, [reloadData]);

  useEffect(() => {
    setUpdateName(user?.name || "");
  }, [user?.name]);

  useEffect(() => {
    if (!showHeaderMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowHeaderMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showHeaderMenu]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const upgradePlan = query.get("upgrade");
    if (!isPaidPlan(upgradePlan)) return;

    if (user?.plan === upgradePlan) {
      notify(`Bạn đang dùng gói ${planLabel(upgradePlan)} rồi.`, "info");
    } else {
      setSelectedUpgradePlan(upgradePlan);
      setShowUpgradeModal(true);
    }

    query.delete("upgrade");
    const cleanSearch = query.toString();
    navigate(
      {
        pathname: location.pathname,
        search: cleanSearch ? `?${cleanSearch}` : ""
      },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate, notify, user?.plan]);

  const handleCreateLead = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await appService.createLead(token, {
        name: leadName,
        source: leadSource,
        contact: leadContact,
        note: leadNote
      });
      setLeadName("");
      setLeadContact("");
      setLeadNote("");
      notify("Đã thêm lead.", "success");
      await reloadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tạo lead.";
      notify(message, "error");
    }
  };

  const handleLeadStatus = async (leadId: string, status: string) => {
    try {
      await appService.updateLeadStatus(token, leadId, status);
      await reloadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật lead.";
      notify(message, "error");
    }
  };

  const handleCreateTask = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await appService.createTask(token, {
        title: taskTitle,
        description: taskDescription,
        type: taskType,
        dueAt: taskDueAt || null
      });
      setTaskTitle("");
      setTaskDescription("");
      setTaskDueAt("");
      notify("Đã tạo công việc.", "success");
      await reloadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tạo công việc.";
      notify(message, "error");
    }
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    try {
      await appService.updateTask(token, taskId, { status });
      await reloadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật công việc.";
      notify(message, "error");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setTaskActionLoadingId(taskId);
    try {
      await appService.updateTask(token, taskId, { status: "done" });
      notify("Đã đánh dấu task hoàn thành.", "success");
      setPendingTaskAction(null);
      await reloadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật công việc.";
      notify(message, "error");
    } finally {
      setTaskActionLoadingId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTaskActionLoadingId(taskId);
    try {
      await appService.deleteTask(token, taskId);
      notify("Đã xóa task.", "success");
      setPendingTaskAction(null);
      await reloadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xóa công việc.";
      notify(message, "error");
    } finally {
      setTaskActionLoadingId(null);
    }
  };

  const handleGenerateContent = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await appService.generateContent(token, {
        profile: {
          businessName: user?.name || "Spa của tôi",
          industry: "Spa & chăm sóc da",
          keyMessage: "Uy tín - thư giãn - hiệu quả"
        },
        input: contentForm
      });
      setContentResult(data.content);
      setQuota(data.quota);
      if (data.meta?.fallback) {
        notify(data.meta.notice || "Đã tạo nội dung mẫu ở chế độ dự phòng.", "info");
      } else {
        notify("Đã tạo nội dung bằng AI.", "success");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tạo nội dung AI.";
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload: { name?: string; currentPassword?: string; newPassword?: string } = {};

      if (updateName.trim() && updateName.trim() !== (user?.name || "")) {
        payload.name = updateName.trim();
      }

      if (newPassword.trim()) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword.trim();
      }

      if (!payload.name && !payload.newPassword) {
        notify("Không có thay đổi để cập nhật.", "info");
        return;
      }

      const result = await appService.updateMyProfile(token, payload);
      notify(result.message, "success");
      setCurrentPassword("");
      setNewPassword("");
      setShowUpdateBox(false);
      await refreshMe();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật tài khoản.";
      notify(message, "error");
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Đã sao chép nội dung.", "success");
    } catch (error) {
      console.error(error);
      notify("Không thể sao chép.", "error");
    }
  };

  const handleOpenUpgrade = (plan?: PaidPlan) => {
    const nextPlan = plan ?? getNextPaidPlan(user?.plan);
    if (!nextPlan) {
      notify("Bạn đang ở gói cao cấp rồi.", "info");
      return;
    }

    setSelectedUpgradePlan(nextPlan);
    setShowUpgradeModal(true);
  };

  const handleConfirmTransfer = async () => {
    setConfirmingUpgrade(true);
    try {
      await appService.createTask(token, {
        title: `Yêu cầu nâng cấp gói ${planLabel(selectedUpgradePlan)}`,
        description: [
          `Khách hàng: ${user?.name || "N/A"} (${user?.email || "N/A"})`,
          `Gói yêu cầu: ${planLabel(selectedUpgradePlan)} - ${formatVnd(selectedPlanPrice)}/tháng`,
          `Mã chuyển khoản: ${transferContent}`,
          "Khách đã xác nhận chuyển khoản trên dashboard."
        ].join("\n"),
        type: "admin",
        status: "todo"
      });

      notify("Đã ghi nhận thanh toán. Admin sẽ kiểm tra và nâng cấp gói sớm cho bạn.", "success");
      setShowUpgradeModal(false);
      setActiveTab("tasks");
      await reloadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể ghi nhận thanh toán.";
      notify(message, "error");
    } finally {
      setConfirmingUpgrade(false);
    }
  };

  const tabButtonClass = (tab: TabKey) =>
    `inline-flex min-h-10 items-center gap-2 rounded-card px-3 text-sm font-semibold transition ${
      activeTab === tab ? "bg-primary text-white" : "bg-panelAlt text-text hover:bg-panel"
    }`;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1240px] px-4 py-4">
      <header className="mb-4 rounded-card border border-line bg-panel p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Spa AI Studio</p>
            <h1 className="text-3xl font-extrabold leading-tight text-text">Xin chào {user?.name}</h1>
            <p className="text-sm text-subtext">
              Gói hiện tại: <span className="font-semibold text-text">{planLabel(user?.plan ?? "mien_phi")}</span> · Lượt soạn bài còn
              lại hôm nay:{" "}
              <span className="font-semibold text-text">
                {quota.remaining}/{quota.limit}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-line bg-panelAlt text-text hover:bg-panel"
              aria-label="Chuyển giao diện"
            >
              {theme === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
            </button>

            <Button onClick={() => handleOpenUpgrade()} className="min-h-10 px-3">
              <Crown size={16} />
              Nâng cấp
            </Button>

            <div className="relative" ref={headerMenuRef}>
              <Button
                variant="secondary"
                className="min-h-10 px-3"
                onClick={() => setShowHeaderMenu((prev) => !prev)}
              >
                <PencilLine size={16} />
                Tùy chọn
                <ChevronDown size={14} />
              </Button>

              {showHeaderMenu ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[220px] rounded-card border border-line bg-panel p-2 shadow-soft">
                  {user?.role === "admin" ? (
                    <button
                      type="button"
                      className="flex w-full items-center rounded-card px-3 py-2 text-left text-sm font-semibold text-text hover:bg-panelAlt"
                      onClick={() => {
                        setShowHeaderMenu(false);
                        navigate("/admin");
                      }}
                    >
                      Trang Admin
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="flex w-full items-center rounded-card px-3 py-2 text-left text-sm font-semibold text-text hover:bg-panelAlt"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      Promise.all([refreshMe(), reloadData()]).catch(() => undefined);
                    }}
                  >
                    Làm mới dữ liệu
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center rounded-card px-3 py-2 text-left text-sm font-semibold text-text hover:bg-panelAlt"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      setShowUpdateBox((prev) => !prev);
                    }}
                  >
                    Cập nhật tài khoản
                  </button>
                </div>
              ) : null}
            </div>

            <Button
              variant="danger"
              className="min-h-10 px-3"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="mb-4 rounded-card border border-line bg-panel px-3 py-2 text-sm font-semibold text-subtext">
          Đang đồng bộ dữ liệu...
        </div>
      ) : null}

      {showUpdateBox ? (
        <Card className="mb-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleUpdateProfile}>
            <div className="md:col-span-2">
              <h2 className="text-lg font-bold text-text">Cập nhật tài khoản ngay trong dashboard</h2>
              <p className="text-sm text-subtext">Bạn có thể đổi tên hiển thị và đổi mật khẩu tại đây.</p>
            </div>
            <InputField label="Họ và tên mới" value={updateName} onChange={(event) => setUpdateName(event.target.value)} />
            <div className="hidden md:block" />
            <InputField
              label="Mật khẩu hiện tại"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              hint="Cần nhập khi đổi mật khẩu."
            />
            <InputField
              label="Mật khẩu mới"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              hint="Bỏ trống nếu chỉ đổi tên."
            />
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit">Lưu cập nhật</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowUpdateBox(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setUpdateName(user?.name || "");
                }}
              >
                Đóng
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <button className={tabButtonClass("overview")} type="button" onClick={() => setActiveTab("overview")}>
          <LayoutDashboard size={16} />
          Tổng quan
        </button>
        <button className={tabButtonClass("content")} type="button" onClick={() => setActiveTab("content")}>
          <Sparkles size={16} />
          Soạn bài nhanh
        </button>
        <button className={tabButtonClass("leads")} type="button" onClick={() => setActiveTab("leads")}>
          <UsersRound size={16} />
          Lead
        </button>
        <button className={tabButtonClass("tasks")} type="button" onClick={() => setActiveTab("tasks")}>
          <ClipboardList size={16} />
          Công việc
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm font-semibold text-subtext">Lead đang mở</p>
            <p className="mt-2 text-3xl font-extrabold text-text">{openCount}</p>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-subtext">Lead đã chốt</p>
            <p className="mt-2 text-3xl font-extrabold text-text">{wonCount}</p>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-subtext">Task chưa hoàn thành</p>
            <p className="mt-2 text-3xl font-extrabold text-text">
              {tasks.filter((task) => task.status !== "done").length}
            </p>
          </Card>
          <Card className="md:col-span-3">
            <h2 className="text-lg font-bold text-text">Menu chào khách và thao tác nhanh</h2>
            <p className="mt-2 text-sm text-subtext">
              Mẫu lời chào: "Spa cảm ơn chị đã nhắn tin. Em gửi ngay gói phù hợp và lịch trong hôm nay để chị chọn nhanh ạ."
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => setActiveTab("content")}>Soạn bài ngay</Button>
              <Button variant="secondary" onClick={() => copyText(contentResult.replyTemplate || "Mẫu phản hồi chưa có.")}>
                <Copy size={16} />
                Sao chép mẫu phản hồi
              </Button>
              <Button variant="secondary" onClick={() => setActiveTab("leads")}>
                Cập nhật lead
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "content" ? (
        <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
          <Card>
            <form className="grid gap-3" onSubmit={handleGenerateContent}>
              <div>
                <h2 className="text-lg font-bold text-text">Soạn bài cho spa</h2>
                <p className="text-sm text-subtext">Điền vài thông tin, hệ thống sẽ gợi ý bài viết để bạn đăng ngay.</p>
              </div>
              <SelectField
                label="Bạn đăng ở đâu?"
                value={contentForm.channel}
                onChange={(event) => setContentForm((prev) => ({ ...prev, channel: event.target.value }))}
              >
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="zalo">Zalo</option>
                <option value="google">Google</option>
              </SelectField>
              <InputField
                label="Bạn muốn đạt điều gì?"
                value={contentForm.goal}
                onChange={(event) => setContentForm((prev) => ({ ...prev, goal: event.target.value }))}
              />
              <InputField
                label="Khách hàng bạn muốn nhắm tới"
                value={contentForm.audience}
                onChange={(event) => setContentForm((prev) => ({ ...prev, audience: event.target.value }))}
              />
              <InputField
                label="Dịch vụ bạn muốn giới thiệu"
                value={contentForm.productOrService}
                onChange={(event) => setContentForm((prev) => ({ ...prev, productOrService: event.target.value }))}
              />
              <TextAreaField
                label="Thông tin thêm (không bắt buộc)"
                value={contentForm.specialNote}
                onChange={(event) => setContentForm((prev) => ({ ...prev, specialNote: event.target.value }))}
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Đang soạn..." : "Soạn nội dung"}
              </Button>
            </form>
          </Card>

          <Card className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-text">Bài gợi ý</h3>
              <Badge tone="neutral">
                Hôm nay còn {quota.remaining}/{quota.limit} lượt
              </Badge>
            </div>
            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Tiêu đề bài viết</p>
              <p className="mt-1 text-sm text-text">{contentResult.headline || "Chưa có nội dung. Bấm \"Soạn nội dung\" để bắt đầu."}</p>
            </article>
            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Nội dung bài đăng</p>
              <p className="mt-1 text-sm text-text">{contentResult.body || "Chưa có nội dung. Bấm \"Soạn nội dung\" để bắt đầu."}</p>
            </article>
            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Lời mời khách hành động</p>
              <p className="mt-1 text-sm text-text">{contentResult.cta || "Chưa có nội dung. Bấm \"Soạn nội dung\" để bắt đầu."}</p>
            </article>
            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Mẫu trả lời khách</p>
              <p className="mt-1 text-sm text-text">{contentResult.replyTemplate || "Chưa có nội dung. Bấm \"Soạn nội dung\" để bắt đầu."}</p>
            </article>
          </Card>
        </div>
      ) : null}

      {activeTab === "leads" ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
          <Card>
            <form className="grid gap-3" onSubmit={handleCreateLead}>
              <h2 className="text-lg font-bold text-text">Thêm lead mới</h2>
              <InputField label="Tên khách / doanh nghiệp" value={leadName} onChange={(event) => setLeadName(event.target.value)} required />
              <InputField label="Nguồn" value={leadSource} onChange={(event) => setLeadSource(event.target.value)} />
              <InputField label="Liên hệ" value={leadContact} onChange={(event) => setLeadContact(event.target.value)} />
              <TextAreaField label="Ghi chú" value={leadNote} onChange={(event) => setLeadNote(event.target.value)} />
              <Button type="submit">Lưu lead</Button>
            </form>
          </Card>
          <Card className="grid gap-3">
            <h2 className="text-lg font-bold text-text">Danh sách lead</h2>
            {leads.map((lead) => {
              const leadId = String(lead._id || lead.id || "");
              return (
                <article key={leadId} className="grid gap-2 rounded-card border border-line bg-panelAlt p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-text">{lead.name}</p>
                    <SelectField
                      label="Trạng thái"
                      value={lead.status}
                      onChange={(event) => handleLeadStatus(leadId, event.target.value)}
                    >
                      {leadStatusOptions.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.label}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <p className="text-xs text-subtext">
                    {lead.source} · {lead.contact || "Chưa có liên hệ"}
                  </p>
                  <p className="text-sm text-subtext">{lead.note || "Chưa có ghi chú"}</p>
                </article>
              );
            })}
          </Card>
        </div>
      ) : null}

      {activeTab === "tasks" ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
          <Card>
            <form className="grid gap-3" onSubmit={handleCreateTask}>
              <h2 className="text-lg font-bold text-text">Tạo công việc mới</h2>
              <InputField label="Tiêu đề" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required />
              <TextAreaField label="Mô tả" value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} />
              <SelectField label="Loại task" value={taskType} onChange={(event) => setTaskType(event.target.value)}>
                <option value="marketing">Marketing</option>
                <option value="follow_up">Follow-up</option>
                <option value="booking">Đặt lịch</option>
              </SelectField>
              <InputField
                label="Hạn hoàn thành"
                type="date"
                value={taskDueAt}
                onChange={(event) => setTaskDueAt(event.target.value)}
              />
              <Button type="submit">
                <MessageSquareText size={16} />
                Tạo task
              </Button>
            </form>
          </Card>

          <Card className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-text">Danh sách công việc</h2>
              <Badge tone="neutral">{tasks.length} task</Badge>
            </div>

            {tasks.map((task) => {
              const isDone = task.status === "done";
              const isPendingAction = pendingTaskAction?.taskId === task._id;
              const isLoadingAction = taskActionLoadingId === task._id;

              const statusLabel =
                task.status === "done" ? "Hoàn thành" : task.status === "in_progress" ? "Đang làm" : "Cần làm";
              const statusTone = task.status === "done" ? "success" : task.status === "todo" ? "warning" : "neutral";
              const taskTypeLabel =
                task.type === "follow_up"
                  ? "Chăm sóc khách"
                  : task.type === "booking"
                    ? "Đặt lịch"
                    : task.type === "admin"
                      ? "Quản trị"
                      : "Marketing";

              return (
                <article
                  key={task._id}
                  className="grid gap-3 rounded-card border border-line bg-panelAlt p-4 shadow-soft transition hover:border-primary/40"
                >
                  <div className="grid gap-3 md:grid-cols-[1fr,220px] md:items-start">
                    <div className="space-y-2">
                      <p className="text-base font-bold leading-tight text-text">{task.title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone}>{statusLabel}</Badge>
                        <Badge tone="neutral">{taskTypeLabel}</Badge>
                        {task.dueAt ? <p className="text-xs text-subtext">Hạn: {task.dueAt}</p> : null}
                      </div>
                    </div>

                    <SelectField
                      label="Trạng thái"
                      value={task.status}
                      onChange={(event) => handleTaskStatus(task._id, event.target.value)}
                    >
                      {taskStatusOptions.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.label}
                        </option>
                      ))}
                    </SelectField>
                  </div>

                  <p className="text-sm leading-relaxed text-subtext">{task.description || "Không có mô tả."}</p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      className="min-h-10 px-3 text-sm"
                      disabled={isDone || isLoadingAction}
                      onClick={() => setPendingTaskAction({ taskId: task._id, action: "done" })}
                    >
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      Đánh dấu hoàn thành
                    </Button>
                    <Button
                      variant="danger"
                      className="min-h-10 px-3 text-sm"
                      disabled={isLoadingAction}
                      onClick={() => setPendingTaskAction({ taskId: task._id, action: "delete" })}
                    >
                      <Trash2 size={14} />
                      Xóa task
                    </Button>
                  </div>

                  {isPendingAction ? (
                    <div className="rounded-card border border-primary/30 bg-panel p-3">
                      <p className="text-sm text-subtext">
                        {pendingTaskAction.action === "done"
                          ? "Xác nhận đánh dấu task này là hoàn thành?"
                          : "Xác nhận xóa task này? Hành động này không thể hoàn tác."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          className="min-h-10 px-3 text-sm"
                          disabled={isLoadingAction}
                          onClick={() =>
                            pendingTaskAction.action === "done"
                              ? handleCompleteTask(task._id)
                              : handleDeleteTask(task._id)
                          }
                        >
                          {isLoadingAction ? "Đang xử lý..." : "Xác nhận"}
                        </Button>
                        <Button
                          variant="secondary"
                          className="min-h-10 px-3 text-sm"
                          disabled={isLoadingAction}
                          onClick={() => setPendingTaskAction(null)}
                        >
                          Hủy
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}

            {tasks.length === 0 ? (
              <p className="rounded-card border border-dashed border-line bg-panelAlt p-3 text-sm text-subtext">
                Chưa có công việc nào. Hãy tạo task đầu tiên ở khung bên trái.
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}

      <UpgradePlanModal
        open={showUpgradeModal}
        currentPlan={user?.plan}
        selectedPlan={selectedUpgradePlan}
        amountVnd={selectedPlanPrice}
        transferContent={transferContent}
        qrImageUrl={vietQrImageUrl}
        confirming={confirmingUpgrade}
        onSelectPlan={setSelectedUpgradePlan}
        onClose={() => setShowUpgradeModal(false)}
        onConfirmPaid={handleConfirmTransfer}
      />
    </div>
  );
}
