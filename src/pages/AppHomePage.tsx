import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  CircleDot,
  Clock3,
  ClipboardList,
  Copy,
  Crown,
  FileText,
  ImagePlus,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  MessageSquareText,
  MoonStar,
  PencilLine,
  SendHorizontal,
  Sparkles,
  SunMedium,
  Trash2,
  UploadCloud,
  UserPlus,
  WandSparkles,
  UsersRound
} from "lucide-react";
import { useAuth } from "../features/auth/AuthProvider";
import { UpgradePlanModal } from "../features/billing/UpgradePlanModal";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import { AutoPostPublishResponse, SocialAccount, appService } from "../services/app.service";
import { AppBrand } from "../shared/components/layout/AppBrand";
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
import { ContentHistoryItem, Lead, TaskItem } from "../types";

type TabKey = "overview" | "content" | "leads" | "tasks" | "autopost";
type AutoPostPlatform = "facebook" | "instagram";
type AutoPostMediaWarning = {
  fileName: string;
  level: "info" | "warning";
  message: string;
};

const autoPostPlatformOptions: Array<{ id: AutoPostPlatform; label: string; note: string }> = [
  { id: "facebook", label: "Facebook", note: "Đăng vào Page đã kết nối" },
  { id: "instagram", label: "Instagram", note: "Business/Creator đã liên kết" }
];

function PanelHeader({
  icon,
  title,
  description,
  action
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-primary/20 bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold leading-tight text-text">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-subtext">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="grid place-items-center rounded-card border border-dashed border-line bg-panelAlt/45 px-4 py-10 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-card border border-primary/20 bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-4 text-base font-bold text-text">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-subtext">{description}</p>
    </div>
  );
}

function SoftStat({ label, value, tone = "text-text" }: { label: string; value: string | number; tone?: string }) {
  return (
    <article className="rounded-card border border-line/70 bg-panelAlt/45 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-subtext">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${tone}`}>{value}</p>
    </article>
  );
}

function formatHashtags(hashtags?: string[]) {
  return Array.isArray(hashtags) ? hashtags.filter(Boolean).join(" ") : "";
}

function getMediaObjectUrl(file: File) {
  return URL.createObjectURL(file);
}

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = getMediaObjectUrl(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_load_failed"));
    };
    image.src = url;
  });
}

function readVideoSize(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = getMediaObjectUrl(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration || 0 });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("video_load_failed"));
    };
    video.src = url;
  });
}

async function inspectAutoPostFile(file: File, checkInstagram: boolean): Promise<AutoPostMediaWarning[]> {
  const warnings: AutoPostMediaWarning[] = [];
  const fileType = file.type || "application/octet-stream";
  const sizeMb = file.size / (1024 * 1024);

  if (!fileType.startsWith("image/") && !fileType.startsWith("video/")) {
    warnings.push({
      fileName: file.name,
      level: "warning",
      message: "Tệp này không phải ảnh/video nên có thể bị nền tảng từ chối."
    });
  }
  if (fileType.startsWith("image/") && sizeMb > 10) {
    warnings.push({ fileName: file.name, level: "warning", message: "Ảnh đang lớn hơn 10MB, nên nén trước khi đăng." });
  }
  if (fileType.startsWith("video/") && sizeMb > 300) {
    warnings.push({ fileName: file.name, level: "warning", message: "Video đang lớn hơn 300MB, nên giảm dung lượng trước." });
  }

  if (!checkInstagram) return warnings;

  try {
    if (fileType.startsWith("image/")) {
      const { width, height } = await readImageSize(file);
      const ratio = width / Math.max(height, 1);
      if (ratio < 0.8 || ratio > 1.91) {
        warnings.push({
          fileName: file.name,
          level: "warning",
          message: "Instagram hợp nhất với ảnh 1:1, 4:5 hoặc 1.91:1. Ảnh này có thể bị cắt."
        });
      }
    }
    if (fileType.startsWith("video/")) {
      const { width, height, duration } = await readVideoSize(file);
      const ratio = width / Math.max(height, 1);
      if (ratio < 0.55 || ratio > 1.91) {
        warnings.push({
          fileName: file.name,
          level: "warning",
          message: "Video nên dùng khung dọc 9:16 hoặc vuông để hiển thị đẹp trên Instagram."
        });
      }
      if (duration > 180) {
        warnings.push({ fileName: file.name, level: "info", message: "Video khá dài, khách có thể ít xem hết. Nên dùng bản ngắn hơn." });
      }
    }
  } catch {
    warnings.push({ fileName: file.name, level: "info", message: "Chưa đọc được kích thước tệp để kiểm tra trước." });
  }

  return warnings;
}

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
  const [contentHistoryLoaded, setContentHistoryLoaded] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
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
  const [contentHistory, setContentHistory] = useState<ContentHistoryItem[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

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
    replyTemplate: "",
    hashtags: [] as string[]
  });
  const [autoPostMode, setAutoPostMode] = useState<"now" | "schedule">("now");
  const [autoPostCaption, setAutoPostCaption] = useState("");
  const [autoPostScheduleAt, setAutoPostScheduleAt] = useState("");
  const [autoPostFiles, setAutoPostFiles] = useState<File[]>([]);
  const [autoPostMediaWarnings, setAutoPostMediaWarnings] = useState<AutoPostMediaWarning[]>([]);
  const [autoPostUseNaturalDelay, setAutoPostUseNaturalDelay] = useState(true);
  const [autoPostSubmitting, setAutoPostSubmitting] = useState(false);
  const [autoPostLastResult, setAutoPostLastResult] = useState<AutoPostPublishResponse | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [socialAccountsLoaded, setSocialAccountsLoaded] = useState(false);
  const [socialConnectingPlatform, setSocialConnectingPlatform] = useState<AutoPostPlatform | null>(null);
  const [autoPostPlatforms, setAutoPostPlatforms] = useState({
    facebook: true,
    instagram: true
  });
  const zernioCallbackRef = useRef("");
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
  const customerTasks = useMemo(() => tasks.filter((task) => task.type !== "admin"), [tasks]);
  const unfinishedTaskCount = useMemo(
    () => customerTasks.filter((task) => task.status !== "done").length,
    [customerTasks]
  );
  const aiUsagePercent = useMemo(() => {
    if (!quota.limit) return 0;
    return Math.min(100, Math.round((quota.used / quota.limit) * 100));
  }, [quota.limit, quota.used]);
  const enabledAutoPostPlatforms = useMemo(() => {
    const list: string[] = [];
    if (autoPostPlatforms.facebook) list.push("Facebook");
    if (autoPostPlatforms.instagram) list.push("Instagram");
    return list;
  }, [autoPostPlatforms.facebook, autoPostPlatforms.instagram]);
  const connectedSocialAccountMap = useMemo(() => {
    const map = new Map<AutoPostPlatform, SocialAccount>();
    socialAccounts.forEach((account) => {
      if ((account.platform === "facebook" || account.platform === "instagram") && account.status === "connected") {
        map.set(account.platform, account);
      }
    });
    return map;
  }, [socialAccounts]);
  const hasConnectedSocialAccount = useCallback(
    (platform: AutoPostPlatform) => connectedSocialAccountMap.has(platform),
    [connectedSocialAccountMap]
  );
  const historyPreviewCount = 3;
  const hasMoreHistory = contentHistory.length > historyPreviewCount;
  const visibleHistory = useMemo(
    () => (showAllHistory ? contentHistory : contentHistory.slice(0, historyPreviewCount)),
    [contentHistory, showAllHistory]
  );

  const formatHistoryTime = useCallback((value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("vi-VN", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }, []);

  const reloadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadData, taskData, quotaData] = await Promise.allSettled([
        appService.getLeads(token),
        appService.getTasks(token),
        appService.getQuota(token)
      ]);

      if (leadData.status === "fulfilled") {
        setLeads(leadData.value.leads);
      }
      if (taskData.status === "fulfilled") {
        setTasks(taskData.value.tasks);
      }
      if (quotaData.status === "fulfilled") {
        setQuota({
          used: quotaData.value.used,
          limit: quotaData.value.limit,
          remaining: quotaData.value.remaining
        });
      }
      const firstRejected = [leadData, taskData, quotaData].find(
        (result) => result.status === "rejected"
      );
      if (firstRejected && firstRejected.status === "rejected") {
        const message =
          firstRejected.reason instanceof Error
            ? firstRejected.reason.message
            : "Một số dữ liệu chưa tải được. Bạn có thể thử làm mới lại.";
        notify(message, "error");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải dữ liệu.";
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify, token]);

  const loadContentHistory = useCallback(
    async (options?: { notifyOnError?: boolean }) => {
      const notifyOnError = options?.notifyOnError ?? true;
      try {
        const historyData = await appService.getContentHistory(token, 12);
        setContentHistory(historyData.items);
      } catch (error) {
        if (notifyOnError) {
          const message = error instanceof Error ? error.message : "Khong the tai lich su noi dung.";
          notify(message, "error");
        }
      } finally {
        setContentHistoryLoaded(true);
      }
    },
    [notify, token]
  );

  const loadSocialAccounts = useCallback(
    async (options?: { notifyOnError?: boolean }) => {
      const notifyOnError = options?.notifyOnError ?? true;
      try {
        const socialData = await appService.getSocialAccounts(token);
        setSocialAccounts(socialData.accounts);
      } catch (error) {
        setSocialAccounts([]);
        if (notifyOnError) {
          const message = error instanceof Error ? error.message : "Khong the tai tai khoan dang bai.";
          notify(message, "error");
        }
      } finally {
        setSocialAccountsLoaded(true);
      }
    },
    [notify, token]
  );

  const refreshAllData = useCallback(async () => {
    await reloadData();
    await Promise.all([
      loadContentHistory({ notifyOnError: false }),
      loadSocialAccounts({ notifyOnError: false })
    ]);
  }, [loadContentHistory, loadSocialAccounts, reloadData]);

  useEffect(() => {
    reloadData().catch(() => undefined);
  }, [reloadData]);

  useEffect(() => {
    if (activeTab === "content" && !contentHistoryLoaded) {
      loadContentHistory({ notifyOnError: false }).catch(() => undefined);
    }
    if (activeTab === "autopost" && !socialAccountsLoaded) {
      loadSocialAccounts({ notifyOnError: false }).catch(() => undefined);
    }
  }, [activeTab, contentHistoryLoaded, loadContentHistory, loadSocialAccounts, socialAccountsLoaded]);

  useEffect(() => {
    setUpdateName(user?.name || "");
  }, [user?.name]);

  useEffect(() => {
    if (!socialAccountsLoaded) return;
    setAutoPostPlatforms((prev) => ({
      facebook: hasConnectedSocialAccount("facebook") ? prev.facebook : false,
      instagram: hasConnectedSocialAccount("instagram") ? prev.instagram : false
    }));
  }, [hasConnectedSocialAccount, socialAccountsLoaded]);

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
    let isActive = true;
    if (!autoPostFiles.length) {
      setAutoPostMediaWarnings([]);
      return () => {
        isActive = false;
      };
    }

    Promise.all(autoPostFiles.map((file) => inspectAutoPostFile(file, autoPostPlatforms.instagram)))
      .then((results) => {
        if (isActive) {
          setAutoPostMediaWarnings(results.flat());
        }
      })
      .catch(() => {
        if (isActive) {
          setAutoPostMediaWarnings([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [autoPostFiles, autoPostPlatforms.instagram]);

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

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const connectedRaw = query.get("connected") || query.get("platform");
    const errorMessage = query.get("error") || query.get("message");
    const profileId = query.get("profileId") || query.get("profile_id") || "";
    const accountId = query.get("accountId") || query.get("account_id") || "";
    const username = query.get("username") || "";
    const displayName = query.get("displayName") || query.get("name") || username;
    const platform = connectedRaw === "facebook" || connectedRaw === "instagram" ? connectedRaw : "";
    const callbackKey = `${platform}:${profileId}:${accountId}:${errorMessage}`;

    if (!platform && !errorMessage) return;
    if (zernioCallbackRef.current === callbackKey) return;
    zernioCallbackRef.current = callbackKey;
    setActiveTab("autopost");

    const cleanQuery = () => {
      ["connected", "platform", "profileId", "profile_id", "accountId", "account_id", "username", "displayName", "name", "error", "message"].forEach(
        (key) => query.delete(key)
      );
      const cleanSearch = query.toString();
      navigate(
        {
          pathname: location.pathname,
          search: cleanSearch ? `?${cleanSearch}` : ""
        },
        { replace: true }
      );
    };

    if (errorMessage) {
      notify("Chưa kết nối được tài khoản mạng xã hội. Vui lòng thử lại.", "error");
      cleanQuery();
      return;
    }

    if (!platform || !profileId || !accountId) {
      notify("Thiếu thông tin kết nối mạng xã hội. Vui lòng thử lại.", "error");
      cleanQuery();
      return;
    }

    appService
      .completeSocialConnect(token, {
        platform: platform as AutoPostPlatform,
        profileId,
        accountId,
        username,
        displayName
      })
      .then((data) => {
        setSocialAccounts((prev) => {
          const rest = prev.filter((account) => account.platform !== data.account.platform);
          return [...rest, data.account];
        });
        setSocialAccountsLoaded(true);
        setAutoPostPlatforms((prev) => ({ ...prev, [platform]: true }));
        notify(`${platform === "facebook" ? "Facebook" : "Instagram"} đã kết nối. Bài đăng sẽ dùng tài khoản này.`, "success");
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Không thể lưu kết nối mạng xã hội.";
        notify(message, "error");
      })
      .finally(cleanQuery);
  }, [location.pathname, location.search, navigate, notify, token]);

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
    setIsGeneratingContent(true);
    try {
      const data = await appService.generateContent(token, {
        profile: {
          businessName: user?.name || "Spa của tôi",
          industry: "Spa & chăm sóc da",
          keyMessage: "Uy tín - thư giãn - hiệu quả"
        },
        input: contentForm
      });
      setContentResult({
        ...data.content,
        hashtags: Array.isArray(data.content.hashtags) ? data.content.hashtags : []
      });
      setQuota(data.quota);
      try {
        const historyData = await appService.getContentHistory(token, 12);
        setContentHistory(historyData.items);
        setContentHistoryLoaded(true);
      } catch (historyError) {
        console.error("[content-history] refresh failed", historyError);
      }
      if (data.meta?.fallback) {
        notify(data.meta.notice || "Đã tạo nội dung mẫu ở chế độ dự phòng.", "info");
      } else {
        notify("Đã tạo nội dung bằng AI.", "success");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tạo nội dung AI.";
      notify(message, "error");
    } finally {
      setIsGeneratingContent(false);
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

  const useHistoryItem = (item: ContentHistoryItem) => {
    setContentForm((prev) => ({
      ...prev,
      channel: item.channel || prev.channel,
      goal: item.goal || prev.goal,
      audience: item.audience || prev.audience,
      productOrService: item.productOrService || prev.productOrService,
      tone: item.tone || prev.tone,
      language: item.language || prev.language,
      specialNote: item.specialNote || ""
    }));
    setContentResult({
      headline: item.headline || "",
      body: item.body || "",
      cta: item.cta || "",
      replyTemplate: item.replyTemplate || "",
      hashtags: Array.isArray(item.hashtags) ? item.hashtags : []
    });
    notify("Đã mở lại nội dung đã tạo.", "success");
  };

  const copyHistoryItem = async (item: ContentHistoryItem) => {
    const text = [
      `Tiêu đề: ${item.headline}`,
      `Nội dung: ${item.body}`,
      `CTA: ${item.cta}`,
      `Hashtag: ${formatHashtags(item.hashtags)}`,
      `Mẫu trả lời khách: ${item.replyTemplate}`
    ].join("\n\n");
    await copyText(text);
  };

  const handleAutoPostFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const files = Array.from(event.target.files || []);
      setAutoPostFiles(files.slice(0, 10));
    } catch (error) {
      console.error("[autopost] read files failed", error);
      notify("Không đọc được tệp tải lên.", "error");
    }
  };

  const handleToggleAutoPostPlatform = (platform: AutoPostPlatform) => {
    if (!hasConnectedSocialAccount(platform)) {
      notify(`Hãy kết nối ${platform === "facebook" ? "Facebook" : "Instagram"} trước khi chọn đăng.`, "info");
      return;
    }
    setAutoPostPlatforms((prev) => ({ ...prev, [platform]: !prev[platform] }));
  };

  const handleConnectSocialPlatform = async (platform: AutoPostPlatform) => {
    try {
      setSocialConnectingPlatform(platform);
      const data = await appService.createSocialConnectUrl(token, platform);
      window.location.assign(data.authUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không tạo được link kết nối.";
      notify(message, "error");
    } finally {
      setSocialConnectingPlatform(null);
    }
  };

  const handleDisconnectSocialPlatform = async (platform: AutoPostPlatform) => {
    const confirmed = window.confirm(
      `Gỡ kết nối ${platform === "facebook" ? "Facebook" : "Instagram"} khỏi tài khoản này?`
    );
    if (!confirmed) return;
    try {
      await appService.disconnectSocialAccount(token, platform);
      setSocialAccounts((prev) => prev.filter((account) => account.platform !== platform));
      setAutoPostPlatforms((prev) => ({ ...prev, [platform]: false }));
      notify("Đã gỡ kết nối trên ứng dụng.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể gỡ kết nối.";
      notify(message, "error");
    }
  };

  const handleUseAiResultForPost = () => {
    const text = [contentResult.headline, contentResult.body, contentResult.cta, formatHashtags(contentResult.hashtags)]
      .filter(Boolean)
      .join("\n\n")
      .trim();
    if (!text) {
      notify("Chưa có nội dung AI để dùng lại.", "info");
      return;
    }
    setAutoPostCaption(text);
    setActiveTab("autopost");
    notify("Đã đưa nội dung AI sang mục Đăng tự động.", "success");
  };

  const handleAutoPostSubmit = async (event: FormEvent) => {
    await handleAutoPostSubmitLive(event);
    return;
    event.preventDefault();
    try {
      const hasPlatform = autoPostPlatforms.facebook || autoPostPlatforms.instagram;
      if (!hasPlatform) {
        notify("Vui lòng chọn ít nhất một nền tảng.", "error");
        return;
      }
      if (!autoPostFiles.length) {
        notify("Vui lòng tải lên ít nhất một ảnh hoặc video.", "error");
        return;
      }
      if (!autoPostCaption.trim()) {
        notify("Vui lòng nhập nội dung bài đăng.", "error");
        return;
      }
      if (autoPostMode === "schedule") {
        if (!autoPostScheduleAt) {
          notify("Vui lòng chọn thời gian hẹn đăng.", "error");
          return;
        }
        const scheduleDate = new Date(autoPostScheduleAt);
        if (Number.isNaN(scheduleDate.getTime()) || scheduleDate.getTime() < Date.now()) {
          notify("Thời gian hẹn đăng cần ở tương lai.", "error");
          return;
        }
      }

      setAutoPostSubmitting(true);
      notify("Đã lưu cấu hình đăng tự động. Mình sẽ nối API đăng thật ở bước tiếp theo.", "success");
    } catch (error) {
      console.error("[autopost] submit failed", error);
      notify("Không thể xử lý đăng tự động lúc này.", "error");
    } finally {
      setAutoPostSubmitting(false);
    }
  };
  const uploadFileToPresignedUrl = async (uploadUrl: string, file: File) => {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream"
      },
      body: file
    });
    if (!response.ok) {
      throw new Error(`Tai tep len that bai (${response.status}).`);
    }
  };

  const handleAutoPostSubmitLive = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setAutoPostLastResult(null);
      const hasPlatform = autoPostPlatforms.facebook || autoPostPlatforms.instagram;
      if (!hasPlatform) {
        notify("Vui long chon it nhat mot nen tang.", "error");
        return;
      }
      const selectedPlatforms: AutoPostPlatform[] = [
        ...(autoPostPlatforms.facebook ? (["facebook"] as const) : []),
        ...(autoPostPlatforms.instagram ? (["instagram"] as const) : [])
      ];
      const missingConnectedAccounts = selectedPlatforms.filter((platform) => !hasConnectedSocialAccount(platform));
      if (missingConnectedAccounts.length) {
        notify(
          `Hãy kết nối ${missingConnectedAccounts.map((platform) => (platform === "facebook" ? "Facebook" : "Instagram")).join(", ")} trước khi đăng.`,
          "error"
        );
        return;
      }
      if (!autoPostFiles.length) {
        notify("Vui long tai len it nhat mot anh hoac video.", "error");
        return;
      }
      if (!autoPostCaption.trim()) {
        notify("Vui long nhap noi dung bai dang.", "error");
        return;
      }
      if (autoPostMode === "schedule") {
        if (!autoPostScheduleAt) {
          notify("Vui long chon thoi gian hen dang.", "error");
          return;
        }
        const scheduleDate = new Date(autoPostScheduleAt);
        if (Number.isNaN(scheduleDate.getTime()) || scheduleDate.getTime() < Date.now()) {
          notify("Thoi gian hen dang can o tuong lai.", "error");
          return;
        }
      }

      setAutoPostSubmitting(true);

      const presign = await appService.createAutoPostPresign(
        token,
        autoPostFiles.map((file) => ({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size
        }))
      );

      if (!presign.items.length || presign.items.length !== autoPostFiles.length) {
        throw new Error("Khong tao duoc du lieu tai tep. Vui long thu lai.");
      }

      await Promise.all(
        presign.items.map((item, index) => {
          const file = autoPostFiles[index];
          if (!file) {
            throw new Error("Co tep khong khop khi tai len.");
          }
          return uploadFileToPresignedUrl(item.uploadUrl, file);
        })
      );

      const publishResult = await appService.publishAutoPost(token, {
        caption: autoPostCaption.trim(),
        platforms: selectedPlatforms,
        mode: autoPostMode,
        scheduleAt: autoPostMode === "schedule" ? new Date(autoPostScheduleAt).toISOString() : undefined,
        timezone: "Asia/Bangkok",
        antiSpamJitter: autoPostUseNaturalDelay,
        mediaItems: presign.items.map((item) => ({
          type: item.mediaType,
          url: item.publicUrl
        }))
      });

      setAutoPostLastResult(publishResult);
      if (publishResult.status === "partial") {
        notify(
          `Da gui ${publishResult.publishedCount} nen tang, ${publishResult.failedCount} nen tang gap loi.`,
          "info"
        );
      } else {
        notify(publishResult.message, "success");
      }
    } catch (error) {
      console.error("[autopost] submit live failed", error);
      const message = error instanceof Error ? error.message : "Khong the xu ly dang tu dong luc nay.";
      notify(message, "error");
    } finally {
      setAutoPostSubmitting(false);
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
      await appService.submitUpgradeRequest(token, {
        plan: selectedUpgradePlan,
        amountVnd: selectedPlanPrice,
        transferContent,
        note: `Khach xac nhan thanh toan tu dashboard cho goi ${planLabel(selectedUpgradePlan)}.`
      });

      notify("Da gui yeu cau thanh toan den admin. Admin se kiem tra va nang cap goi cho ban.", "success");
      setShowUpgradeModal(false);
      await reloadData();
      return;

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
    `inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-card px-3.5 text-sm font-bold transition ${
      activeTab === tab
        ? "bg-primary text-white shadow-soft"
        : "border border-line/70 bg-panel/65 text-subtext backdrop-blur-xl hover:border-primary/40 hover:bg-panelAlt/85 hover:text-text"
    }`;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1180px] px-4 py-5 md:px-5">
      <header className="relative z-40 mb-3 overflow-visible isolate rounded-card border border-white/10 bg-panel/80 p-2.5 shadow-soft backdrop-blur-xl md:p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),600px] xl:items-center">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex shrink-0 items-center rounded-[18px] border border-[#4d2132] bg-[#1b1017]/88 px-2.5 py-2 shadow-soft backdrop-blur-xl">
              <AppBrand compact logoClassName="h-10 w-10" />
            </div>

            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-primary">
                <Sparkles size={12} />
                VELA AI dashboard
              </p>
              <h1 className="mt-1 text-2xl font-extrabold leading-tight text-text">Xin chào {user?.name}</h1>
              <p className="mt-0.5 max-w-[520px] truncate text-xs leading-5 text-subtext">
                Xem lead, tạo nội dung, theo dõi công việc và chuẩn bị đăng bài.
              </p>
            </div>
          </div>

          <div className="rounded-card border border-line/70 bg-panelAlt/50 p-1.5 shadow-soft backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[180px] shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-extrabold text-text">Gói {planLabel(user?.plan ?? "mien_phi")}</p>
                  <Badge tone="success">
                    Còn {quota.remaining}/{quota.limit}
                  </Badge>
                </div>
                <progress
                  className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full accent-primary"
                  value={quota.used}
                  max={quota.limit || 1}
                  aria-label="Tỷ lệ sử dụng AI trong ngày"
                />
                <span className="sr-only">
                  Đã dùng {quota.used}/{quota.limit} lượt hôm nay ({aiUsagePercent}%).
                </span>
              </div>

              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-card border border-line bg-panel text-text transition hover:bg-panelAlt"
                aria-label="Chuyển giao diện"
              >
                {theme === "dark" ? <SunMedium size={15} /> : <MoonStar size={15} />}
              </button>

              <Button onClick={() => handleOpenUpgrade()} className="!min-h-8 h-8 shrink-0 px-2 text-xs">
                <Crown size={14} />
                Nâng cấp
              </Button>

              <div className="relative z-50 shrink-0" ref={headerMenuRef}>
                <Button
                  variant="secondary"
                  className="!min-h-8 h-8 px-2 text-xs"
                  onClick={() => setShowHeaderMenu((prev) => !prev)}
                >
                  <PencilLine size={14} />
                  Cài đặt
                  <ChevronDown size={13} />
                </Button>

                {showHeaderMenu ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-[80] w-[220px] rounded-card border border-line bg-panel p-2 shadow-soft">
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
                        Promise.all([refreshMe(), refreshAllData()]).catch(() => undefined);
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
                className="!min-h-8 h-8 shrink-0 px-2 text-xs"
                onClick={() => {
                  logout();
                  navigate("/login", { replace: true });
                }}
              >
                <LogOut size={14} />
                <span>Thoát</span>
              </Button>
            </div>
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

      <div className="relative z-10 mb-4 flex flex-wrap gap-2 rounded-card border border-white/10 bg-panel/70 p-2 shadow-soft backdrop-blur-xl">
        <button className={tabButtonClass("overview")} type="button" onClick={() => setActiveTab("overview")}>
          <LayoutDashboard size={16} />
          Tổng quan
        </button>
        <button className={tabButtonClass("content")} type="button" onClick={() => setActiveTab("content")}>
          <Sparkles size={16} />
          Tạo nội dung
        </button>
        <button className={tabButtonClass("leads")} type="button" onClick={() => setActiveTab("leads")}>
          <UsersRound size={16} />
          Lead
        </button>
        <button className={tabButtonClass("tasks")} type="button" onClick={() => setActiveTab("tasks")}>
          <ClipboardList size={16} />
          Công việc
        </button>
        <button className={tabButtonClass("autopost")} type="button" onClick={() => setActiveTab("autopost")}>
          <SendHorizontal size={16} />
          Đăng tự động
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4">
          <Card className="bg-panel/82">
            <div className="grid gap-4 lg:grid-cols-[1fr,2fr] lg:items-center">
              <PanelHeader
                icon={<LayoutDashboard size={18} />}
                title="Tổng quan hôm nay"
                description="Nhìn nhanh tình hình khách, nội dung và công việc trong ngày."
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <SoftStat label="Lead đang mở" value={openCount} />
                <SoftStat label="Đã chốt" value={wonCount} tone="text-success" />
                <SoftStat label="Việc còn lại" value={unfinishedTaskCount} tone="text-warning" />
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr),minmax(280px,0.75fr)]">
            <Card className="bg-panel/82">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <PanelHeader
                  icon={<MessageSquareText size={18} />}
                  title="Menu chào khách"
                  description="Mẫu câu và thao tác nhanh để phản hồi khách mới trong vài giây."
                  action={<Badge tone="success">Sẵn sàng</Badge>}
                />
              </div>
              <p className="mt-4 rounded-card border border-line/70 bg-panelAlt/45 p-3 text-sm leading-6 text-subtext">
                "Spa cảm ơn chị đã nhắn tin. Em gửi ngay gói phù hợp và lịch trong hôm nay để chị chọn nhanh ạ."
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Button onClick={() => setActiveTab("content")} className="w-full">
                  <Sparkles size={16} />
                  Tạo nội dung
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => copyText(contentResult.replyTemplate || "Mẫu phản hồi chưa có.")}
                >
                  <Copy size={16} />
                  Sao chép
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setActiveTab("leads")}>
                  Cập nhật lead
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setActiveTab("autopost")}>
                  Đăng bài
                </Button>
              </div>
            </Card>

            <Card className="bg-panel/82">
              <PanelHeader
                icon={<Crown size={18} />}
                title="Tài nguyên"
                description={`Gói ${planLabel(user?.plan ?? "mien_phi")} còn ${quota.remaining} lượt tạo nội dung.`}
              />
              <div className="mt-4 grid gap-2">
                <Button onClick={() => handleOpenUpgrade()} className="w-full">
                  <Crown size={16} />
                  Xem gói nâng cấp
                </Button>
                <Button variant="secondary" onClick={() => refreshAllData()} className="w-full">
                  Làm mới dữ liệu
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "content" ? (
        <div className="grid items-start gap-4 xl:grid-cols-[0.98fr,1.02fr]">
          <Card className="bg-panel/86">
            <form className="grid gap-4" onSubmit={handleGenerateContent}>
              <PanelHeader
                icon={<WandSparkles size={18} />}
                title="Tạo nội dung cho spa"
                description="Điền vài ý chính, hệ thống sẽ gợi ý bài đăng có tiêu đề, lời mời và mẫu trả lời khách."
              />

              <div className="grid gap-3 md:grid-cols-2">
                <SelectField
                  label="Bạn đăng ở đâu?"
                  value={contentForm.channel}
                  onChange={(event) => setContentForm((prev) => ({ ...prev, channel: event.target.value }))}
                  hint="Chọn kênh bạn muốn đăng bài."
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </SelectField>
                <SelectField
                  label="Cách viết"
                  value={contentForm.tone}
                  onChange={(event) => setContentForm((prev) => ({ ...prev, tone: event.target.value }))}
                  hint="Chọn kiểu bài hợp với thương hiệu của spa."
                >
                  <option value="friendly">Gần gũi, dễ chốt lịch</option>
                  <option value="premium">Cao cấp, tinh tế</option>
                  <option value="storytelling">Kể chuyện, chạm cảm xúc</option>
                  <option value="playful">Tươi vui, thu hút</option>
                  <option value="expert">Chuyên gia, đáng tin</option>
                </SelectField>
              </div>

              <div className="grid gap-3 rounded-card border border-line/70 bg-panelAlt/35 p-3">
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
                  label="Thông tin thêm"
                  hint="Ưu đãi, số điện thoại, khu vực hoặc điều bạn muốn nhấn mạnh."
                  value={contentForm.specialNote}
                  onChange={(event) => setContentForm((prev) => ({ ...prev, specialNote: event.target.value }))}
                  className="min-h-32"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
                <Button type="submit" disabled={isGeneratingContent || loading}>
                  <Sparkles size={16} />
                  {isGeneratingContent ? "Đang tạo..." : "Tạo nội dung"}
                </Button>
                <Button type="button" variant="secondary" onClick={handleUseAiResultForPost}>
                  <SendHorizontal size={16} />
                  Dùng để đăng
                </Button>
              </div>
            </form>
          </Card>

          <Card className="grid gap-3 bg-panel/86">
            <PanelHeader
              icon={<FileText size={18} />}
              title="Bài gợi ý"
              description="Xem nhanh nội dung vừa tạo và dùng lại các bài đã lưu."
              action={<Badge tone="neutral">Còn {quota.remaining}/{quota.limit} lượt</Badge>}
            />

            <div className="grid gap-3">
              <article className="rounded-card border border-primary/15 bg-primary/10 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Tiêu đề bài viết</p>
                <p className="mt-2 text-base font-bold leading-7 text-text">
                  {contentResult.headline || "Chưa có nội dung. Bấm \"Tạo nội dung\" để bắt đầu."}
                </p>
              </article>
              <article className="rounded-card border border-line/70 bg-panelAlt/45 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-subtext">Nội dung bài đăng</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text">
                  {contentResult.body || "Chưa có nội dung. Bấm \"Tạo nội dung\" để bắt đầu."}
                </p>
              </article>
              <div className="grid gap-3 md:grid-cols-2">
                <article className="rounded-card border border-line/70 bg-panelAlt/45 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-subtext">Lời mời khách</p>
                  <p className="mt-2 text-sm leading-6 text-text">
                    {contentResult.cta || "Chưa có nội dung. Bấm \"Tạo nội dung\" để bắt đầu."}
                  </p>
                </article>
                <article className="rounded-card border border-line/70 bg-panelAlt/45 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-subtext">Mẫu trả lời khách</p>
                  <p className="mt-2 text-sm leading-6 text-text">
                    {contentResult.replyTemplate || "Chưa có nội dung. Bấm \"Tạo nội dung\" để bắt đầu."}
                  </p>
                </article>
              </div>
              <article className="rounded-card border border-line/70 bg-panelAlt/45 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-subtext">Hashtag gợi ý</p>
                {contentResult.hashtags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {contentResult.hashtags.map((hashtag) => (
                      <Badge key={hashtag} tone="success">
                        {hashtag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-subtext">Chưa có hashtag. Tạo nội dung để hệ thống gợi ý.</p>
                )}
              </article>
            </div>

            <article className="rounded-card border border-line/70 bg-panelAlt/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-subtext">Lịch sử nội dung</p>
                  <Badge tone="neutral">{contentHistory.length} mục</Badge>
                </div>
                {hasMoreHistory ? (
                  <Button className="min-h-8 px-3 text-xs" variant="ghost" onClick={() => setShowAllHistory((prev) => !prev)}>
                    {showAllHistory ? "Thu gọn" : `Xem thêm ${contentHistory.length - historyPreviewCount} mục`}
                  </Button>
                ) : null}
              </div>
              {contentHistory.length === 0 ? (
                <p className="mt-2 text-sm text-subtext">Chưa có nội dung đã lưu. Tạo bài đầu tiên để bắt đầu lịch sử.</p>
              ) : (
                <div className="mt-3 grid max-h-[300px] gap-2 overflow-y-auto overflow-x-hidden pr-1">
                  {visibleHistory.map((item) => (
                    <div key={item._id} className="min-w-0 max-w-full overflow-hidden rounded-card border border-line/70 bg-panel/80 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 max-w-full truncate text-sm font-semibold text-text sm:max-w-[70%]">
                          {item.headline || "Nội dung không tiêu đề"}
                        </p>
                        <div className="inline-flex items-center gap-2">
                          {item.isFallback ? <Badge tone="warning">Bản nháp</Badge> : <Badge tone="success">Đã tạo</Badge>}
                          <span className="text-xs text-subtext">{formatHistoryTime(item.createdAt)}</span>
                        </div>
                      </div>
                      <p className="mt-1 truncate text-xs text-subtext">
                        {item.channel} · {item.goal}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button className="min-h-8 px-3 text-xs" variant="secondary" onClick={() => useHistoryItem(item)}>
                          Dùng lại
                        </Button>
                        <Button className="min-h-8 px-3 text-xs" variant="ghost" onClick={() => copyHistoryItem(item)}>
                          <Copy size={14} />
                          Sao chép
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </Card>
        </div>
      ) : null}

      {activeTab === "leads" ? (
        <div className="grid items-start gap-4 xl:grid-cols-[0.9fr,1.1fr]">
          <Card className="bg-panel/86">
            <form className="grid gap-4" onSubmit={handleCreateLead}>
              <PanelHeader
                icon={<UserPlus size={18} />}
                title="Thêm khách tiềm năng"
                description="Lưu thông tin khách để đội spa theo dõi tư vấn và chốt lịch dễ hơn."
              />
              <div className="grid gap-3 rounded-card border border-line/70 bg-panelAlt/35 p-3">
                <InputField
                  label="Tên khách"
                  value={leadName}
                  onChange={(event) => setLeadName(event.target.value)}
                  required
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <InputField label="Nguồn khách" value={leadSource} onChange={(event) => setLeadSource(event.target.value)} />
                  <InputField label="Số điện thoại hoặc inbox" value={leadContact} onChange={(event) => setLeadContact(event.target.value)} />
                </div>
                <TextAreaField
                  label="Ghi chú tư vấn"
                  value={leadNote}
                  onChange={(event) => setLeadNote(event.target.value)}
                  className="min-h-32"
                />
              </div>
              <Button type="submit">
                <UserPlus size={16} />
                Lưu khách
              </Button>
            </form>
          </Card>

          <Card className="grid gap-3 bg-panel/86">
            <PanelHeader
              icon={<UsersRound size={18} />}
              title="Danh sách lead"
              description="Theo dõi trạng thái từng khách, tránh bỏ sót người đang quan tâm."
              action={<Badge tone="neutral">{leads.length} lead</Badge>}
            />

            {leads.length === 0 ? (
              <EmptyState
                icon={<UsersRound size={20} />}
                title="Chưa có lead nào"
                description="Khi có khách nhắn tin hoặc để lại thông tin, hãy thêm vào đây để chăm sóc tiếp."
              />
            ) : (
              <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1">
                {leads.map((lead) => {
                  const leadId = String(lead._id || lead.id || "");
                  const currentStatus = leadStatusOptions.find((status) => status.id === lead.status)?.label || "Đang theo dõi";
                  return (
                    <article
                      key={leadId}
                      className="grid gap-3 rounded-card border border-line/70 bg-panelAlt/45 p-3 transition hover:border-primary/35 hover:bg-panelAlt/65"
                    >
                      <div className="grid gap-3 md:grid-cols-[1fr,210px] md:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-extrabold text-text">{lead.name}</p>
                            <Badge tone="success">{currentStatus}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-subtext">
                            {lead.source} · {lead.contact || "Chưa có liên hệ"}
                          </p>
                        </div>
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
                      <p className="rounded-card border border-line/60 bg-panel/65 px-3 py-2 text-sm leading-6 text-subtext">
                        {lead.note || "Chưa có ghi chú tư vấn."}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {activeTab === "tasks" ? (
        <div className="grid items-start gap-4 xl:grid-cols-[0.9fr,1.1fr]">
          <Card className="bg-panel/86">
            <form className="grid gap-4" onSubmit={handleCreateTask}>
              <PanelHeader
                icon={<ClipboardList size={18} />}
                title="Tạo công việc mới"
                description="Ghi lại việc cần xử lý trong ngày để không bỏ sót lead, nội dung hoặc lịch hẹn."
              />
              <div className="grid gap-3 rounded-card border border-line/70 bg-panelAlt/35 p-3">
                <InputField label="Tên việc cần làm" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required />
                <TextAreaField
                  label="Mô tả ngắn"
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                  className="min-h-32"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField label="Nhóm công việc" value={taskType} onChange={(event) => setTaskType(event.target.value)}>
                    <option value="marketing">Marketing</option>
                    <option value="follow_up">Chăm sóc khách</option>
                    <option value="booking">Đặt lịch</option>
                  </SelectField>
                  <InputField
                    label="Hạn hoàn thành"
                    type="date"
                    value={taskDueAt}
                    onChange={(event) => setTaskDueAt(event.target.value)}
                  />
                </div>
              </div>
              <Button type="submit">
                <ListChecks size={16} />
                Tạo công việc
              </Button>
            </form>
          </Card>

          <Card className="grid gap-3 bg-panel/86">
            <PanelHeader
              icon={<ListChecks size={18} />}
              title="Danh sách công việc"
              description="Chỉ hiển thị công việc của khách hàng. Task quản trị được tách riêng trong trang Admin."
              action={<Badge tone="neutral">{customerTasks.length} việc</Badge>}
            />

            {customerTasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={20} />}
                title="Chưa có công việc nào"
                description="Tạo việc đầu tiên ở khung bên trái để theo dõi những việc cần làm trong ngày."
              />
            ) : (
              <div className="grid max-h-[620px] gap-3 overflow-y-auto pr-1">
                {customerTasks.map((task) => {
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
                      className="grid gap-3 rounded-card border border-line/70 bg-panelAlt/45 p-3 transition hover:border-primary/35 hover:bg-panelAlt/65"
                    >
                      <div className="grid gap-3 md:grid-cols-[1fr,210px] md:items-start">
                        <div className="space-y-2">
                          <p className="text-base font-extrabold leading-tight text-text">{task.title}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={statusTone}>{statusLabel}</Badge>
                            <Badge tone="neutral">{taskTypeLabel}</Badge>
                            {task.dueAt ? (
                              <span className="inline-flex items-center gap-1 text-xs text-subtext">
                                <CalendarDays size={13} />
                                {task.dueAt}
                              </span>
                            ) : null}
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

                      <p className="rounded-card border border-line/60 bg-panel/65 px-3 py-2 text-sm leading-6 text-subtext">
                        {task.description || "Không có mô tả."}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          className="min-h-10 px-3 text-sm"
                          disabled={isDone || isLoadingAction}
                          onClick={() => setPendingTaskAction({ taskId: task._id, action: "done" })}
                        >
                          <CheckCircle2 size={14} className="text-success" />
                          Hoàn thành
                        </Button>
                        <Button
                          variant="danger"
                          className="min-h-10 px-3 text-sm"
                          disabled={isLoadingAction}
                          onClick={() => setPendingTaskAction({ taskId: task._id, action: "delete" })}
                        >
                          <Trash2 size={14} />
                          Xóa
                        </Button>
                      </div>

                      {isPendingAction ? (
                        <div className="rounded-card border border-primary/25 bg-primary/10 p-3">
                          <p className="text-sm text-subtext">
                            {pendingTaskAction.action === "done"
                              ? "Xác nhận công việc này đã hoàn thành?"
                              : "Xác nhận xóa công việc này? Sau khi xóa sẽ không thể khôi phục."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              className="min-h-10 px-3 text-sm"
                              disabled={isLoadingAction}
                              onClick={() =>
                                pendingTaskAction.action === "done" ? handleCompleteTask(task._id) : handleDeleteTask(task._id)
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
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {activeTab === "autopost" ? (
        <div className="grid items-start gap-4 xl:grid-cols-[0.98fr,1.02fr]">
          <Card className="bg-panel/86">
            <form className="grid gap-4" onSubmit={handleAutoPostSubmit}>
              <PanelHeader
                icon={<Megaphone size={18} />}
                title="Đăng bài tự động"
                description="Chọn nền tảng, tải ảnh hoặc video, nhập caption rồi đăng ngay hoặc hẹn giờ."
              />

              <article className="rounded-card border border-warning/25 bg-warning/10 p-3">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-text">
                  <AlertCircle size={16} className="text-warning" />
                  Lưu ý trước khi dùng
                </p>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-subtext">
                  <p>Bài đăng chỉ đi qua tài khoản mà khách hàng đã tự kết nối trong mục này.</p>
                  <p>Facebook chỉ đăng vào Page đã kết nối, không đăng vào trang cá nhân.</p>
                  <p>Instagram cần tài khoản Business hoặc Creator đã liên kết.</p>
                  <p>Nếu một nền tảng lỗi, hệ thống vẫn xử lý nền tảng còn lại.</p>
                </div>
              </article>

              <div className="grid gap-3 rounded-card border border-line/70 bg-panelAlt/35 p-3">
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-text">Tài khoản đăng bài</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {autoPostPlatformOptions.map((platform) => {
                      const account = connectedSocialAccountMap.get(platform.id);
                      const connected = Boolean(account);
                      return (
                        <article
                          key={platform.id}
                          className={`rounded-card border p-3 ${
                            connected ? "border-success/30 bg-success/10" : "border-line bg-panel/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-text">{platform.label}</p>
                              <p className="mt-1 truncate text-xs text-subtext">
                                {connected ? account?.displayName || account?.username || "Đã kết nối" : platform.note}
                              </p>
                            </div>
                            <Badge tone={connected ? "success" : "warning"}>
                              {connected ? "Đã kết nối" : "Chưa kết nối"}
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={connected ? "secondary" : "primary"}
                              className="!min-h-9 h-9 px-3 text-xs"
                              disabled={socialConnectingPlatform === platform.id}
                              onClick={() => handleConnectSocialPlatform(platform.id)}
                            >
                              {socialConnectingPlatform === platform.id ? "Đang mở..." : connected ? "Kết nối lại" : "Kết nối"}
                            </Button>
                            {connected ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="!min-h-9 h-9 px-3 text-xs"
                                onClick={() => handleDisconnectSocialPlatform(platform.id)}
                              >
                                Gỡ
                              </Button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-text">Nền tảng đăng</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {autoPostPlatformOptions.map((platform) => {
                      const connected = hasConnectedSocialAccount(platform.id);
                      const selected = autoPostPlatforms[platform.id];
                      return (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => handleToggleAutoPostPlatform(platform.id)}
                          className={`flex cursor-pointer items-center justify-between rounded-card border px-3 py-3 text-left transition ${
                            selected
                              ? "border-primary/45 bg-primary/15 text-text"
                              : "border-line bg-panel/70 text-subtext hover:border-primary/35"
                          } ${connected ? "" : "opacity-80"}`}
                        >
                          <span>
                            <span className="block font-bold">{platform.label}</span>
                            <span className="mt-1 block text-xs text-subtext">
                              {connected ? "Sẵn sàng đăng" : "Cần kết nối trước"}
                            </span>
                          </span>
                          <Badge tone={selected ? "success" : connected ? "neutral" : "warning"}>
                            {selected ? "Đã chọn" : connected ? "Tắt" : "Chưa kết nối"}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <span className="text-sm font-semibold text-text">Ảnh / video</span>
                  <label
                    htmlFor="auto-post-files"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-line bg-panel/70 px-4 py-7 text-center transition hover:border-primary/45 hover:bg-panelAlt/75"
                  >
                    <UploadCloud size={24} className="text-primary" />
                    <span className="mt-2 text-sm font-bold text-text">Chọn ảnh hoặc video</span>
                    <span className="mt-1 text-xs text-subtext">
                      {autoPostFiles.length ? `${autoPostFiles.length} tệp đã chọn` : "Tối đa 10 tệp mỗi lần"}
                    </span>
                    <input
                      id="auto-post-files"
                      className="sr-only"
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleAutoPostFileChange}
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField
                    label="Thời điểm đăng"
                    value={autoPostMode}
                    onChange={(event) => setAutoPostMode(event.target.value as "now" | "schedule")}
                  >
                    <option value="now">Đăng ngay</option>
                    <option value="schedule">Hẹn giờ đăng</option>
                  </SelectField>

                  {autoPostMode === "schedule" ? (
                    <InputField
                      label="Ngày giờ hẹn đăng"
                      type="datetime-local"
                      value={autoPostScheduleAt}
                      onChange={(event) => setAutoPostScheduleAt(event.target.value)}
                    />
                  ) : (
                    <div className="grid min-w-0 gap-1.5">
                      <span className="text-sm font-semibold leading-5 text-text">Trạng thái</span>
                      <div className="flex h-[50px] min-w-0 items-center rounded-card border border-line bg-panelAlt/70 px-3">
                        <p className="truncate text-sm text-text">Đăng ngay sau khi xác nhận</p>
                      </div>
                    </div>
                  )}
                </div>

                {autoPostMode === "schedule" ? (
                  <button
                    type="button"
                    onClick={() => setAutoPostUseNaturalDelay((value) => !value)}
                    className="flex cursor-pointer items-start justify-between gap-3 rounded-card border border-line bg-panel/70 px-3 py-3 text-left transition hover:border-primary/40"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-text">Giãn giờ đăng tự nhiên</span>
                      <span className="mt-1 block text-xs text-subtext">
                        Tránh đăng đồng loạt cùng một giây lên nhiều nền tảng.
                      </span>
                    </span>
                    <Badge tone={autoPostUseNaturalDelay ? "success" : "neutral"}>
                      {autoPostUseNaturalDelay ? "Bật" : "Tắt"}
                    </Badge>
                  </button>
                ) : null}

                <TextAreaField
                  label="Nội dung bài đăng"
                  value={autoPostCaption}
                  onChange={(event) => setAutoPostCaption(event.target.value)}
                  placeholder="Nhập caption để đăng lên Facebook/Instagram"
                  className="min-h-36"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
                <Button type="submit" disabled={autoPostSubmitting}>
                  <SendHorizontal size={16} />
                  {autoPostSubmitting ? "Đang xử lý..." : "Xác nhận đăng"}
                </Button>
                <Button type="button" variant="secondary" onClick={handleUseAiResultForPost}>
                  <Sparkles size={16} />
                  Dùng bài vừa tạo
                </Button>
              </div>
            </form>
          </Card>

          <Card className="grid gap-3 bg-panel/86">
            <PanelHeader
              icon={<CircleDot size={18} />}
              title="Xem trước bài đăng"
              description="Kiểm tra nền tảng, thời điểm, tệp và caption trước khi xác nhận."
              action={<Badge tone="neutral">{enabledAutoPostPlatforms.length} nền tảng</Badge>}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-card border border-line/70 bg-panelAlt/45 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-subtext">Nền tảng đã chọn</p>
                <p className="mt-2 text-sm font-semibold text-text">
                  {enabledAutoPostPlatforms.length ? enabledAutoPostPlatforms.join(" · ") : "Chưa chọn nền tảng."}
                </p>
              </article>

              <article className="rounded-card border border-line/70 bg-panelAlt/45 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-subtext">Thời điểm đăng</p>
                <p className="mt-2 text-sm font-semibold text-text">
                  {autoPostMode === "now"
                    ? "Đăng ngay sau khi xác nhận"
                    : autoPostScheduleAt
                      ? new Date(autoPostScheduleAt).toLocaleString("vi-VN", { hour12: false })
                      : "Chưa chọn thời gian hẹn đăng"}
                </p>
              </article>
            </div>

            <article className="rounded-card border border-line/70 bg-panelAlt/45 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-subtext">Tệp đã chọn</p>
              {autoPostFiles.length === 0 ? (
                <p className="mt-2 text-sm text-subtext">Chưa có tệp.</p>
              ) : (
                <div className="mt-3 grid max-h-[260px] gap-2 overflow-y-auto pr-1">
                  {autoPostFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-card border border-line/70 bg-panel/75 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">{file.name}</p>
                        <p className="text-xs text-subtext">{file.type || "application/octet-stream"}</p>
                      </div>
                      {file.type.startsWith("video/") ? <Clock3 size={15} className="text-subtext" /> : <ImagePlus size={15} className="text-subtext" />}
                    </div>
                  ))}
                </div>
              )}
              {autoPostMediaWarnings.length ? (
                <div className="mt-3 grid gap-2">
                  {autoPostMediaWarnings.map((warning, index) => (
                    <div
                      key={`${warning.fileName}-${index}`}
                      className="rounded-card border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-5 text-subtext"
                    >
                      <span className="font-semibold text-text">{warning.fileName}: </span>
                      {warning.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>

            <article className="rounded-card border border-line/70 bg-panelAlt/45 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-subtext">Nội dung sẽ đăng</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text">
                {autoPostCaption.trim() || "Chưa có nội dung."}
              </p>
            </article>

            <article className="rounded-card border border-line/70 bg-panelAlt/35 p-3">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-text">
                <UploadCloud size={16} />
                Kết nối đăng bài
              </p>
              <p className="mt-2 text-xs leading-5 text-subtext">
                Hệ thống sẽ gửi bài qua Zernio sau khi bạn bấm xác nhận. Nếu một nền tảng lỗi, nền tảng còn lại vẫn được xử lý.
              </p>
              {autoPostLastResult ? (
                <div className="mt-3 grid max-h-[220px] gap-2 overflow-y-auto pr-1">
                  {autoPostLastResult.results.map((item, index) => (
                    <div
                      key={`${item.platform}-${item.postId || index}`}
                      className="rounded-card border border-line/70 bg-panel/75 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-text">{item.platform.toUpperCase()}</p>
                        <Badge tone={item.ok ? "success" : "warning"}>{item.ok ? "Thành công" : "Có lỗi"}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-subtext">{item.message || "Đã xử lý."}</p>
                      {item.platformPostUrl ? (
                        <a
                          href={item.platformPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
                        >
                          Mở bài đã đăng
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-subtext">
                Chế độ: {autoPostMode === "now" ? "Đăng ngay" : "Hẹn giờ"} · Múi giờ: Asia/Bangkok
              </p>
            </article>
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
