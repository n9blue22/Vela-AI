import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, UserCog, Users } from "lucide-react";
import { useAuth } from "../features/auth/AuthProvider";
import { useToast } from "../hooks/useToast";
import { appService } from "../services/app.service";
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

export function AdminPage() {
  const { token, user } = useAuth();
  const { notify } = useToast();

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState({ users: 0, leads: 0, tasks: 0 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, userData, taskData] = await Promise.all([
        appService.getAdminOverview(token),
        appService.getAdminUsers(token),
        appService.getAdminTasks(token)
      ]);
      setOverview(overviewData);
      setUsers(userData.users as AdminUser[]);
      setTasks(taskData.tasks);
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
    <div className="mx-auto min-h-screen w-full max-w-[1240px] px-4 py-4">
      <header className="mb-4 rounded-card border border-line bg-panel p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Admin Panel</p>
            <h1 className="text-2xl font-extrabold text-text">Quản trị hệ thống Spa AI</h1>
            <p className="text-sm text-subtext">Xin chào {user?.name}. Bạn có thể quản lý người dùng, gói và task trực tiếp.</p>
          </div>
          <div className="inline-flex items-center gap-2">
            {loading ? <Badge tone="neutral">Đang tải...</Badge> : null}
            <Link to="/app" className="inline-flex min-h-10 items-center rounded-card bg-primary px-4 text-sm font-semibold text-white">
              Quay lại ứng dụng
            </Link>
          </div>
        </div>
      </header>

      <section className="mb-4 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-subtext">
            <Users size={16} />
            Người dùng
          </p>
          <p className="mt-2 text-3xl font-extrabold">{overview.users}</p>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-subtext">
            <UserCog size={16} />
            Lead toàn hệ thống
          </p>
          <p className="mt-2 text-3xl font-extrabold">{overview.leads}</p>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-subtext">
            <ShieldCheck size={16} />
            Task toàn hệ thống
          </p>
          <p className="mt-2 text-3xl font-extrabold">{overview.tasks}</p>
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

        <Card className="grid gap-2">
          <h2 className="text-lg font-bold text-text">Quản lý người dùng</h2>
          {users.map((item) => (
            <article key={item.id} className="grid gap-2 rounded-card border border-line bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-text">{item.name}</p>
                  <p className="text-xs text-subtext">{item.email}</p>
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
        </Card>
      </section>

      <section>
        <Card className="grid gap-2">
          <h2 className="text-lg font-bold text-text">Quản lý task toàn hệ thống</h2>
          {tasks.map((task) => (
            <article key={task._id} className="grid gap-2 rounded-card border border-line bg-panelAlt p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-text">{task.title}</p>
                  <p className="text-xs text-subtext">
                    {task.ownerName} · {task.ownerEmail}
                  </p>
                </div>
                <SelectField
                  label="Trạng thái"
                  value={task.status}
                  onChange={(event) => handleTaskStatus(task._id, event.target.value)}
                >
                  <option value="todo">Cần làm</option>
                  <option value="in_progress">Đang làm</option>
                  <option value="done">Hoàn thành</option>
                </SelectField>
              </div>
              <p className="text-sm text-subtext">{task.description || "Không có mô tả"}</p>
            </article>
          ))}
        </Card>
      </section>
    </div>
  );
}
