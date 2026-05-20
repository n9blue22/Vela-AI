import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Copy,
  Crown,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  MoonStar,
  PencilLine,
  SendHorizontal,
  Sparkles,
  SunMedium,
  Trash2,
  UploadCloud,
  UsersRound
} from "lucide-react";
import { useAuth } from "../features/auth/AuthProvider";
import { UpgradePlanModal } from "../features/billing/UpgradePlanModal";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import { AutoPostPublishResponse, appService } from "../services/app.service";
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
type AutoPostMediaWarning = {
  fileName: string;
  level: "info" | "warning";
  message: string;
};

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
  const [autoPostPlatforms, setAutoPostPlatforms] = useState({
    facebook: true,
    instagram: true
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
  const enabledAutoPostPlatforms = useMemo(() => {
    const list: string[] = [];
    if (autoPostPlatforms.facebook) list.push("Facebook");
    if (autoPostPlatforms.instagram) list.push("Instagram");
    return list;
  }, [autoPostPlatforms.facebook, autoPostPlatforms.instagram]);
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
      const [leadData, taskData, quotaData, historyData] = await Promise.allSettled([
        appService.getLeads(token),
        appService.getTasks(token),
        appService.getQuota(token),
        appService.getContentHistory(token, 12)
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
      if (historyData.status === "fulfilled") {
        setContentHistory(historyData.value.items);
      }

      const firstRejected = [leadData, taskData, quotaData, historyData].find(
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

  const handleToggleAutoPostPlatform = (platform: "facebook" | "instagram") => {
    setAutoPostPlatforms((prev) => ({ ...prev, [platform]: !prev[platform] }));
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
        platforms: [
          ...(autoPostPlatforms.facebook ? (["facebook"] as const) : []),
          ...(autoPostPlatforms.instagram ? (["instagram"] as const) : [])
        ],
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
    `inline-flex min-h-10 items-center gap-2 rounded-card px-3 text-sm font-semibold transition ${
      activeTab === tab ? "bg-primary text-white" : "bg-panelAlt text-text hover:bg-panel"
    }`;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1240px] px-4 py-4">
      <header className="mb-4 rounded-card border border-line bg-panel p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-3 rounded-card border border-line/70 bg-panelAlt/70 px-2.5 py-2 shadow-soft">
              <AppBrand logoClassName="h-10 max-w-[105px] rounded-md" />
              <div className="h-8 w-px bg-line/80" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtext">EMS AI MARKETING SPA</p>
                <p className="text-xs text-subtext/90">Nền tảng vận hành và marketing cho spa</p>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight text-text">Xin chào {user?.name}</h1>
            <p className="text-sm text-subtext">
              Gói hiện tại: <span className="font-semibold text-text">{planLabel(user?.plan ?? "mien_phi")}</span> · Lượt AI còn
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
              <Button onClick={() => setActiveTab("content")}>Tạo nội dung ngay</Button>
              <Button variant="secondary" onClick={() => copyText(contentResult.replyTemplate || "Mẫu phản hồi chưa có.")}>
                <Copy size={16} />
                Sao chép mẫu phản hồi
              </Button>
              <Button variant="secondary" onClick={() => setActiveTab("leads")}>
                Cập nhật lead
              </Button>
              <Button variant="secondary" onClick={() => setActiveTab("autopost")}>
                Mở đăng tự động
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
                <h2 className="text-lg font-bold text-text">Tạo nội dung cho spa</h2>
                <p className="text-sm text-subtext">Điền vài thông tin, hệ thống sẽ gợi ý bài viết để bạn đăng ngay.</p>
              </div>
              <SelectField
                label="Bạn đăng ở đâu?"
                value={contentForm.channel}
                onChange={(event) => setContentForm((prev) => ({ ...prev, channel: event.target.value }))}
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
              <Button type="submit" disabled={isGeneratingContent || loading}>
                {isGeneratingContent ? "Đang tạo..." : "Tạo nội dung"}
              </Button>
              <Button type="button" variant="secondary" onClick={handleUseAiResultForPost}>
                Dùng nội dung này để đăng tự động
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
              <p className="mt-1 text-sm text-text">{contentResult.headline || "Chưa có nội dung. Bấm \"Tạo nội dung\" để bắt đầu."}</p>
            </article>
            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Nội dung bài đăng</p>
              <p className="mt-1 text-sm text-text">{contentResult.body || "Chưa có nội dung. Bấm \"Tạo nội dung\" để bắt đầu."}</p>
            </article>
            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Lời mời khách hành động</p>
              <p className="mt-1 text-sm text-text">{contentResult.cta || "Chưa có nội dung. Bấm \"Tạo nội dung\" để bắt đầu."}</p>
            </article>
            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Hashtag gợi ý</p>
              {contentResult.hashtags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {contentResult.hashtags.map((hashtag) => (
                    <Badge key={hashtag} tone="success">
                      {hashtag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-text">Chưa có hashtag. Bấm "Tạo nội dung" để bắt đầu.</p>
              )}
            </article>
            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Mẫu trả lời khách</p>
              <p className="mt-1 text-sm text-text">{contentResult.replyTemplate || "Chưa có nội dung. Bấm \"Tạo nội dung\" để bắt đầu."}</p>
            </article>
            <article className="rounded-card border border-line bg-panelAlt p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Lịch sử nội dung AI</p>
                  <Badge tone="neutral">{contentHistory.length} mục</Badge>
                </div>
                {hasMoreHistory ? (
                  <Button
                    className="min-h-8 px-3 text-xs"
                    variant="ghost"
                    onClick={() => setShowAllHistory((prev) => !prev)}
                  >
                    {showAllHistory ? "Thu gọn" : `Xem thêm ${contentHistory.length - historyPreviewCount} mục`}
                  </Button>
                ) : null}
              </div>
              {contentHistory.length === 0 ? (
                <p className="mt-2 text-sm text-subtext">Chưa có nội dung đã lưu. Tạo nội dung đầu tiên để bắt đầu lịch sử.</p>
              ) : (
                <div className="mt-2 grid max-h-[320px] gap-2 overflow-y-auto overflow-x-hidden pr-1">
                  {visibleHistory.map((item) => (
                    <div key={item._id} className="min-w-0 max-w-full overflow-hidden rounded-card border border-line/70 bg-panel px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 max-w-full truncate text-sm font-semibold text-text sm:max-w-[70%]">{item.headline || "Nội dung không tiêu đề"}</p>
                        <div className="inline-flex items-center gap-2">
                          {item.isFallback ? <Badge tone="warning">Bản nháp</Badge> : <Badge tone="success">AI</Badge>}
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

      {activeTab === "autopost" ? (
        <div className="grid gap-4 xl:grid-cols-[1.02fr,0.98fr]">
          <Card>
            <form className="grid gap-3" onSubmit={handleAutoPostSubmit}>
              <div>
                <h2 className="text-lg font-bold text-text">Đăng bài tự động</h2>
                <p className="text-sm text-subtext">Tải ảnh/video, nhập nội dung rồi chọn đăng ngay hoặc hẹn giờ.</p>
              </div>

              <article className="rounded-card border border-warning/35 bg-warning/10 p-3">
                <p className="text-sm font-semibold text-text">Lưu ý trước khi dùng</p>
                <p className="mt-1 text-xs text-subtext">Facebook chỉ đăng vào Page đã kết nối.</p>
                <p className="mt-1 text-xs text-subtext">Instagram cần tài khoản Business hoặc Creator đã liên kết.</p>
                <p className="mt-1 text-xs text-subtext">Nếu một nền tảng lỗi, hệ thống vẫn đăng nền tảng còn lại.</p>
              </article>

              <div className="grid gap-2">
                <p className="text-sm font-semibold text-text">Nền tảng đăng</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={autoPostPlatforms.facebook ? "primary" : "secondary"}
                    className="min-h-10 px-3"
                    onClick={() => handleToggleAutoPostPlatform("facebook")}
                  >
                    Facebook
                  </Button>
                  <Button
                    type="button"
                    variant={autoPostPlatforms.instagram ? "primary" : "secondary"}
                    className="min-h-10 px-3"
                    onClick={() => handleToggleAutoPostPlatform("instagram")}
                  >
                    Instagram
                  </Button>
                </div>
              </div>

              <InputField
                label="Ảnh / video"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleAutoPostFileChange}
                hint="Tối đa 10 tệp mỗi lần."
              />

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
              ) : null}

              {autoPostMode === "schedule" ? (
                <button
                  type="button"
                  onClick={() => setAutoPostUseNaturalDelay((value) => !value)}
                  className="flex items-start justify-between gap-3 rounded-card border border-line bg-panelAlt px-3 py-3 text-left transition hover:border-primary/60"
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
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={autoPostSubmitting}>
                  <SendHorizontal size={16} />
                  {autoPostSubmitting ? "Đang xử lý..." : "Xác nhận đăng tự động"}
                </Button>
                <Button type="button" variant="secondary" onClick={handleUseAiResultForPost}>
                  <Sparkles size={16} />
                  Dùng nội dung AI gần nhất
                </Button>
              </div>
            </form>
          </Card>

          <Card className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-text">Xem trước cấu hình đăng</h3>
              <Badge tone="neutral">{enabledAutoPostPlatforms.length} nền tảng</Badge>
            </div>

            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Nền tảng đã chọn</p>
              <p className="mt-1 text-sm text-text">
                {enabledAutoPostPlatforms.length ? enabledAutoPostPlatforms.join(" · ") : "Chưa chọn nền tảng."}
              </p>
            </article>

            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Thời điểm đăng</p>
              <p className="mt-1 text-sm text-text">
                {autoPostMode === "now"
                  ? "Đăng ngay sau khi xác nhận"
                  : autoPostScheduleAt
                    ? new Date(autoPostScheduleAt).toLocaleString("vi-VN", { hour12: false })
                    : "Chưa chọn thời gian hẹn đăng"}
              </p>
            </article>

            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Tệp đã tải lên</p>
              {autoPostFiles.length === 0 ? (
                <p className="mt-1 text-sm text-subtext">Chưa có tệp.</p>
              ) : (
                <div className="mt-2 grid max-h-[280px] gap-2 overflow-y-auto pr-1">
                  {autoPostFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-card border border-line/70 bg-panel px-3 py-2">
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
                      className="rounded-card border border-warning/35 bg-warning/10 px-3 py-2 text-xs text-subtext"
                    >
                      <span className="font-semibold text-text">{warning.fileName}: </span>
                      {warning.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>

            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Nội dung sẽ đăng</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                {autoPostCaption.trim() || "Chưa có nội dung."}
              </p>
            </article>

            <article className="rounded-card border border-line bg-panelAlt p-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-text">
                <UploadCloud size={16} />
                Trạng thái tích hợp
              </p>
              <p className="mt-1 text-xs text-subtext">
                Mục này đã tách riêng theo yêu cầu của bạn. Mình sẽ nối API Zernio để bấm là đăng thật ở bước tiếp theo.
              </p>
              <p className="mt-1 text-xs text-subtext">
                Webhook: /api/integrations/zernio/webhook
              </p>
              <p className="mt-1 text-xs text-subtext">
                Đã bật luồng đăng thật: hệ thống sẽ gửi bài qua Zernio ngay sau khi bạn bấm xác nhận.
              </p>
              {autoPostLastResult ? (
                <div className="mt-3 grid max-h-[220px] gap-2 overflow-y-auto pr-1">
                  {autoPostLastResult.results.map((item, index) => (
                    <div
                      key={`${item.platform}-${item.postId || index}`}
                      className="rounded-card border border-line/70 bg-panel px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-text">{item.platform.toUpperCase()}</p>
                        <Badge tone={item.ok ? "success" : "warning"}>{item.ok ? "Thanh cong" : "Loi"}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-subtext">{item.message || "Da xu ly."}</p>
                      {item.platformPostUrl ? (
                        <a
                          href={item.platformPostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-primary hover:underline"
                        >
                          Mo bai da dang
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="mt-1 text-xs text-subtext">
                Chế độ: {autoPostMode === "now" ? "Đăng ngay" : "Hẹn giờ"} · Timezone mặc định: Asia/Bangkok
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
