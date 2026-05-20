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
  const requestUrl = `${API_BASE_URL}${normalizePath(path)}`;
  const hasBody = config.body !== undefined && config.body !== null;

  try {
    const response = await fetch(requestUrl, {
      method: config.method ?? "GET",
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {})
      },
      body: hasBody ? JSON.stringify(config.body) : undefined,
      signal: controller.signal
    });

    const rawText = await response.text();
    let data: unknown = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { message: rawText };
      }
    }
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
      let apiHost = "127.0.0.1:5050";
      try {
        apiHost = new URL(API_BASE_URL).host || apiHost;
      } catch {
        // keep default host hint
      }
      throw new Error(`Không kết nối được máy chủ API (${apiHost}). Hãy kiểm tra backend đang chạy.`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
