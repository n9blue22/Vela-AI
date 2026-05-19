interface RequestConfig {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  timeoutMs?: number;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5050/api").replace(/\/$/, "");
const DEFAULT_TIMEOUT_MS = 15000;

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export async function apiRequest<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
      method: config.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {})
      },
      body: config.body ? JSON.stringify(config.body) : undefined,
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (data as { message?: string }).message || `API lỗi ${response.status}`;
      throw new Error(message);
    }

    return data as T;
  } catch (error) {
    console.error("[api] request failed", error);

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Yêu cầu tới server quá chậm. Vui lòng thử lại.");
    }

    if (error instanceof TypeError && String(error.message).toLowerCase().includes("failed to fetch")) {
      throw new Error("Không kết nối được máy chủ API (127.0.0.1:5050). Hãy kiểm tra backend đang chạy.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
