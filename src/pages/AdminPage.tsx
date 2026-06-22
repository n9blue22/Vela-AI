import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MoonStar, ShieldCheck, SunMedium, UserCog, Users } from "lucide-react";
import { useAuth } from "../features/auth/AuthProvider";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import { appService } from "../services/app.service";
import { AppBrand } from "../shared/components/layout/AppBrand";
import { planLabel } from "../shared/constants/plans";
import { Badge } from "../shared/components/ui/Badge";
import { Button } from "../shared/components/ui/Button";
import { Card } from "../shared/components/ui/Card";
import { InputField, SelectField } from "../shared/components/ui/Field";
import { TaskItem } from "../types";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  plan: "mien_phi" | "tiet_kiem" | "cao_cap";
  isEmailVerified: boolean;
  planLimit: {
    label: string;
    maxLeads: number;
    dailyContentGenerations: number;
  };
}

type TaskStatusFilter = "all" | TaskItem["status"];
type TaskScopeFilter = "all" | "admin" | "customer";
type TaskDescriptionItem = { kind: "pair"; label: string; value: string } | { kind: "text"; text: string };
const taskStatusOrder: Record<TaskItem["status"], number> = {
  todo: 0,
  in_progress: 1,
  done: 2
};

const taskStatusOptions: Array<{ id: TaskItem["status"]; label: string }> = [
  { id: "todo", label: "Cần làm" },
  { id: "in_progress", label: "Đang làm" },
  { id: "done", label: "Hoàn thành" }
];

function taskStatusLabel(status: TaskItem["status"]) {
  if (status === "done") return "Hoàn thành";
  if (status === "in_progress") return "Đang làm";
  return "Cần làm";
}

function taskStatusTone(status: TaskItem["status"]) {
  if (status === "done") return "success" as const;
  if (status === "in_progress") return "neutral" as const;
  return "warning" as const;
}

function taskTypeLabel(type: TaskItem["type"]) {
  if (type === "follow_up") return "Chăm sóc khách";
  if (type === "booking") return "Đặt lịch";
  if (type === "admin") return "Quản trị";
  return "Marketing";
}

function formatAdminTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour12: false });
}

function parseTaskDescription(rawText?: string): TaskDescriptionItem[] {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0 && colonIndex <= 40 && colonIndex < line.length - 1) {
      return {
        kind: "pair",
        label: line.slice(0, colonIndex).trim(),
        value: line.slice(colonIndex + 1).trim()
      };
    }
    return {
      kind: "text",
      text: line
    };
  });
}

export function AdminPage() {
  const { token, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { notify } = useToast();

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState({ users: 0, leads: 0, tasks: 0 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [userKeyword, setUserKeyword] = useState("");
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [taskKeyword, setTaskKeyword] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>("all");
  const [taskScopeFilter, setTaskScopeFilter] = useState<TaskScopeFilter>("all");
  const [showAllTasks, setShowAllTasks] = useState(false);

  const normalizedKeyword = userKeyword.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedKeyword) return users;
    return users.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const email = String(item.email || "").toLowerCase();
      return name.includes(normalizedKeyword) || email.includes(normalizedKeyword);
    });
  }, [normalizedKeyword, users]);

  const userPreviewCount = 4;
  const hasMoreUsers = filteredUsers.length > userPreviewCount;
  const visibleUsers = useMemo(
    () => (showAllUsers ? filteredUsers : filteredUsers.slice(0, userPreviewCount)),
    [filteredUsers, showAllUsers]
  );

  const normalizedTaskKeyword = taskKeyword.trim().toLowerCase();
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const passStatus = taskStatusFilter === "all" ? true : task.status === taskStatusFilter;
      if (!passStatus) return false;
      const passScope =
        taskScopeFilter === "all" ? true : taskScopeFilter === "admin" ? task.type === "admin" : task.type !== "admin";
      if (!passScope) return false;
      if (!normalizedTaskKeyword) return true;

      const searchable = [
        task.title,
        task.description,
        task.ownerName || "",
        task.ownerEmail || "",
        taskTypeLabel(task.type)
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedTaskKeyword);
    });
  }, [normalizedTaskKeyword, taskScopeFilter, taskStatusFilter, tasks]);

  const sortedFilteredTasks = useMemo(() => {
    const tasksCopy = [...filteredTasks];
    tasksCopy.sort((left, right) => {
      const leftStatusOrder = taskStatusOrder[left.status];
      const rightStatusOrder = taskStatusOrder[right.status];
      if (leftStatusOrder !== rightStatusOrder) return leftStatusOrder - rightStatusOrder;

      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
    return tasksCopy;
  }, [filteredTasks]);

  const taskPreviewCount = 6;
  const hasMoreTasks = sortedFilteredTasks.length > taskPreviewCount;
  const visibleTasks = useMemo(
    () => (showAllTasks ? sortedFilteredTasks : sortedFilteredTasks.slice(0, taskPreviewCount)),
    [showAllTasks, sortedFilteredTasks]
  );

  const taskOverview = useMemo(() => {
    const todo = tasks.filter((task) => task.status === "todo").length;
    const inProgress = tasks.filter((task) => task.status === "in_progress").length;
    const done = tasks.filter((task) => task.status === "done").length;
    const admin = tasks.filter((task) => task.type === "admin").length;
    const customer = tasks.length - admin;
    return { todo, inProgress, done, admin, customer };
  }, [tasks]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, userData, taskData] = await Promise.allSettled([
        appService.getAdminOverview(token),
        appService.getAdminUsers(token),
        appService.getAdminTasks(token)
      ]);

      if (overviewData.status === "fulfilled") {
        setOverview(overviewData.value);
      }
      if (userData.status === "fulfilled") {
        setUsers(userData.value.users as AdminUser[]);
      }
      if (taskData.status === "fulfilled") {
        setTasks(taskData.value.tasks);
      }

      const firstRejected = [overviewData, userData, taskData].find((result) => result.status === "rejected");
      if (firstRejected && firstRejected.status === "rejected") {
        const message =
          firstRejected.reason instanceof Error
            ? firstRejected.reason.message
            : "Một số dữ liệu admin chưa tải được. Hãy thử lại.";
        notify(message, "error");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải dữ liệu admin.";
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify, token]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const handlePlanChange = async (userId: string, plan: string) => {
    try {
      await appService.updateUserPlan(token, userId, plan);
      notify("Đã cập nhật gói dịch vụ.", "success");
      await reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật gói.";
      notify(message, "error");
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await appService.updateUserRole(token, userId, role);
      notify("Đã cập nhật vai trò.", "success");
      await reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật vai trò.";
      notify(message, "error");
    }
  };

  const handlePromoteAdmin = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const data = await appService.promoteAdmin(token, newAdminEmail);
      notify(data.message, "success");
      setNewAdminEmail("");
      await reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể thêm admin.";
      notify(message, "error");
    }
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    try {
      await appService.updateAdminTask(token, taskId, { status: status as TaskItem["status"] });
      notify("Đã cập nhật trạng thái task.", "info");
      await reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể cập nhật task.";
      notify(message, "error");
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1240px] px-4 py-5">
      <header className="mb-5 overflow-hidden rounded-card border border-white/20 bg-panel/80 p-4 shadow-soft backdrop-blur-xl md:p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr,360px] lg:items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-[18px] border border-[#4d2132] bg-[#1b1017]/88 px-3 py-2 shadow-soft backdrop-blur-xl">
              <AppBrand compact logoClassName="h-10 w-10" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtext">Admin Center</p>
                <p className="text-xs text-subtext/90">Quản lý người dùng, gói dịch vụ và yêu cầu toàn hệ thống</p>
              </div>
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
                <ShieldCheck size={14} />
                Bảng điều khiển quản trị
              </p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight text-text md:text-4xl">Quản trị hệ thống VELA AI</h1>
              <p className="mt-2 max-w-[680px] text-sm leading-6 text-subtext">
                Xin chào {user?.name}. Theo dõi vận hành, duyệt yêu cầu nâng cấp và phân quyền người dùng trong một giao diện gọn hơn.
              </p>
            </div>
          </div>

          <div className="rounded-card border border-line/70 bg-panelAlt/60 p-3 shadow-soft backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-subtext">Trạng thái dữ liệu</p>
                <p className="mt-1 text-xl font-extrabold text-text">{loading ? "Đang đồng bộ" : "Sẵn sàng"}</p>
              </div>
              {loading ? <Badge tone="neutral">Đang tải...</Badge> : <Badge tone="success">Hoạt động</Badge>}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-line bg-panel text-text transition hover:bg-panelAlt"
                aria-label="Chuyển giao diện"
              >
                {theme === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
              </button>
              <Link
                to="/app"
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-card bg-primary px-4 text-sm font-bold text-white shadow-soft transition hover:bg-primaryStrong"
              >
                Quay lại dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="mb-4 grid gap-4 md:grid-cols-3">
        <Card className="bg-panel/80">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-subtext">
            <Users size={18} className="text-primary" />
            Người dùng
          </p>
          <p className="mt-3 text-3xl font-extrabold text-text">{overview.users}</p>
          <p className="mt-1 text-xs text-subtext">Tài khoản đang có trong hệ thống</p>
        </Card>
        <Card className="bg-panel/80">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-subtext">
            <UserCog size={18} className="text-warning" />
            Lead toàn hệ thống
          </p>
          <p className="mt-3 text-3xl font-extrabold text-text">{overview.leads}</p>
          <p className="mt-1 text-xs text-subtext">Tổng khách quan tâm đã lưu</p>
        </Card>
        <Card className="bg-panel/80">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-subtext">
            <ShieldCheck size={18} className="text-success" />
            Task toàn hệ thống
          </p>
          <p className="mt-3 text-3xl font-extrabold text-text">{overview.tasks}</p>
          <p className="mt-1 text-xs text-subtext">Việc admin và người dùng đang theo dõi</p>
        </Card>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-[0.85fr,1.15fr]">
        <Card>
          <form className="grid gap-3" onSubmit={handlePromoteAdmin}>
            <h2 className="text-lg font-bold text-text">Thêm admin mới</h2>
            <p className="text-sm text-subtext">Email phải có tài khoản trước đó. Admin mới sẽ có quyền quản trị hệ thống.</p>
            <InputField
              label="Email tài khoản"
              type="email"
              value={newAdminEmail}
              onChange={(event) => setNewAdminEmail(event.target.value)}
              required
            />
            <Button type="submit">Cấp quyền admin</Button>
          </form>
        </Card>

        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-text">Quản lý người dùng</h2>
            <Badge tone="neutral">{filteredUsers.length} tài khoản</Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr,auto] sm:items-end">
            <InputField
              label="Tìm nhanh theo tên hoặc email"
              value={userKeyword}
              onChange={(event) => {
                setUserKeyword(event.target.value);
                setShowAllUsers(false);
              }}
              placeholder="Ví dụ: bảo hoặc @gmail.com"
            />
            {hasMoreUsers ? (
              <Button className="min-h-10 px-3 text-sm sm:mb-[2px]" variant="ghost" onClick={() => setShowAllUsers((prev) => !prev)}>
                {showAllUsers ? "Thu gọn" : `Xem thêm ${filteredUsers.length - userPreviewCount} mục`}
              </Button>
            ) : null}
          </div>

          {filteredUsers.length === 0 ? (
            <p className="rounded-card border border-dashed border-line bg-panelAlt p-3 text-sm text-subtext">
              Không tìm thấy tài khoản phù hợp.
            </p>
          ) : (
            <div className="grid max-h-[580px] gap-2 overflow-y-auto pr-1">
              {visibleUsers.map((item) => (
                <article key={item.id} className="grid gap-2 rounded-card border border-line bg-panelAlt p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">{item.name}</p>
                      <p className="break-all text-xs text-subtext">{item.email}</p>
                    </div>
                    <Badge tone={item.isEmailVerified ? "success" : "warning"}>
                      {item.isEmailVerified ? "Đã xác thực email" : "Chưa xác thực"}
                    </Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <SelectField label="Gói dịch vụ" value={item.plan} onChange={(event) => handlePlanChange(item.id, event.target.value)}>
                      <option value="mien_phi">Miễn phí</option>
                      <option value="tiet_kiem">Tiết kiệm</option>
                      <option value="cao_cap">Cao cấp</option>
                    </SelectField>
                    <SelectField label="Vai trò" value={item.role} onChange={(event) => handleRoleChange(item.id, event.target.value)}>
                      <option value="customer">Khách hàng</option>
                      <option value="admin">Admin</option>
                    </SelectField>
                  </div>
                  <p className="text-xs text-subtext">
                    {planLabel(item.plan)} ·{" "}
                    {item.planLimit.maxLeads === Number.MAX_SAFE_INTEGER ? "Lead không giới hạn" : `Tối đa ${item.planLimit.maxLeads} lead`} ·{" "}
                    {item.planLimit.dailyContentGenerations} lượt AI/ngày
                  </p>
                </article>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-text">Quản lý task toàn hệ thống</h2>
            <Badge tone="neutral">{sortedFilteredTasks.length} task</Badge>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr,200px,200px,auto] md:items-end">
            <InputField
              label="Tìm task theo tiêu đề, email, nội dung"
              value={taskKeyword}
              onChange={(event) => {
                setTaskKeyword(event.target.value);
                setShowAllTasks(false);
              }}
              placeholder="Ví dụ: nâng cấp gói hoặc @gmail.com"
            />
            <SelectField
              label="Lọc trạng thái"
              value={taskStatusFilter}
              onChange={(event) => {
                setTaskStatusFilter(event.target.value as TaskStatusFilter);
                setShowAllTasks(false);
              }}
            >
              <option value="all">Tất cả</option>
              {taskStatusOptions.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Lọc loại task"
              value={taskScopeFilter}
              onChange={(event) => {
                setTaskScopeFilter(event.target.value as TaskScopeFilter);
                setShowAllTasks(false);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="admin">Task quản trị</option>
              <option value="customer">Task khách hàng</option>
            </SelectField>
            {hasMoreTasks ? (
              <Button className="min-h-10 px-3 text-sm md:mb-[2px]" variant="ghost" onClick={() => setShowAllTasks((prev) => !prev)}>
                {showAllTasks ? "Thu gọn" : `Xem thêm ${sortedFilteredTasks.length - taskPreviewCount} task`}
              </Button>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <article className="rounded-card border border-line/70 bg-panelAlt px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Task quản trị</p>
              <p className="mt-1 text-xl font-bold text-primary">{taskOverview.admin}</p>
            </article>
            <article className="rounded-card border border-line/70 bg-panelAlt px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Task khách hàng</p>
              <p className="mt-1 text-xl font-bold text-text">{taskOverview.customer}</p>
            </article>
            <article className="rounded-card border border-line/70 bg-panelAlt px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Cần làm</p>
              <p className="mt-1 text-xl font-bold text-warning">{taskOverview.todo}</p>
            </article>
            <article className="rounded-card border border-line/70 bg-panelAlt px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Đang làm</p>
              <p className="mt-1 text-xl font-bold text-text">{taskOverview.inProgress}</p>
            </article>
            <article className="rounded-card border border-line/70 bg-panelAlt px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Hoàn thành</p>
              <p className="mt-1 text-xl font-bold text-success">{taskOverview.done}</p>
            </article>
          </div>

          {sortedFilteredTasks.length === 0 ? (
            <p className="rounded-card border border-dashed border-line bg-panelAlt p-3 text-sm text-subtext">
              Chưa có task phù hợp bộ lọc hiện tại.
            </p>
          ) : (
            <div className="grid max-h-[680px] gap-2 overflow-y-auto pr-1">
              {visibleTasks.map((task) => {
                const descriptionItems = parseTaskDescription(task.description);
                const topDescriptionItems = descriptionItems.slice(0, 4);
                const extraDescriptionItems = descriptionItems.slice(4);

                return (
                  <article key={task._id} className="grid gap-3 rounded-card border border-line bg-panelAlt p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr,220px] md:items-start">
                      <div className="min-w-0 space-y-2">
                        <p className="truncate text-base font-bold text-text">{task.title}</p>
                        <p className="text-xs text-subtext">
                          {task.ownerName || "Không rõ người tạo"} · {task.ownerEmail || "Không rõ email"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
                          <Badge tone="neutral">{taskTypeLabel(task.type)}</Badge>
                          {task.createdAt ? <span className="text-xs text-subtext">Tạo: {formatAdminTime(task.createdAt)}</span> : null}
                        </div>
                      </div>

                      <label className="grid min-w-0 gap-1">
                        <span className="text-sm font-semibold text-text">Trạng thái</span>
                        <select
                          className="w-full min-w-0 rounded-card border border-line bg-panel px-3 py-2 text-sm text-text outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
                          value={task.status}
                          onChange={(event) => handleTaskStatus(task._id, event.target.value)}
                        >
                          {taskStatusOptions.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {topDescriptionItems.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {topDescriptionItems.map((item, index) =>
                          item.kind === "pair" ? (
                            <article key={`${task._id}-desc-${index}`} className="rounded-card border border-line/70 bg-panel px-3 py-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">{item.label}</p>
                              <p className="mt-1 break-words text-sm text-text">{item.value}</p>
                            </article>
                          ) : (
                            <article key={`${task._id}-desc-${index}`} className="rounded-card border border-line/70 bg-panel px-3 py-2 sm:col-span-2">
                              <p className="break-words text-sm text-subtext">{item.text}</p>
                            </article>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-subtext">Không có mô tả.</p>
                    )}

                    {extraDescriptionItems.length ? (
                      <details className="rounded-card border border-line/70 bg-panel px-3 py-2">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-subtext">
                          Xem thêm chi tiết
                        </summary>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {extraDescriptionItems.map((item, index) =>
                            item.kind === "pair" ? (
                              <article key={`${task._id}-extra-${index}`} className="rounded-card border border-line/70 bg-panelAlt px-3 py-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-subtext">{item.label}</p>
                                <p className="mt-1 break-words text-sm text-text">{item.value}</p>
                              </article>
                            ) : (
                              <article key={`${task._id}-extra-${index}`} className="rounded-card border border-line/70 bg-panelAlt px-3 py-2 sm:col-span-2">
                                <p className="break-words text-sm text-subtext">{item.text}</p>
                              </article>
                            )
                          )}
                        </div>
                      </details>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
