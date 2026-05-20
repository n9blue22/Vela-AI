import { env } from "../config/env.js";

const DEFAULT_TIMEOUT_MS = 12000;
const PROVIDER_PRIORITY = ["quota", "rate_limit", "network", "timeout", "invalid_key", "missing_key", "provider_error"];

function buildPrompt({ profile, input }) {
  const toneGuide = {
    friendly: "thân thiện, gần gũi, tự nhiên như nhân viên spa đang tư vấn",
    premium: "cao cấp, tinh tế, ít nói quá, tạo cảm giác đáng tin",
    storytelling: "kể chuyện ngắn, chạm vào tình huống đời thường của khách",
    playful: "vui vẻ, có chút tươi vui nhẹ, không lố",
    expert: "chuyên gia, rõ ràng, có lý do và lợi ích cụ thể"
  };
  const selectedTone = toneGuide[input.tone] || input.tone || toneGuide.friendly;

  return [
    "Bạn là chuyên gia copywriting spa tại Việt Nam, viết tiếng Việt tự nhiên như người bán hàng thật.",
    "Bắt buộc dùng tiếng Việt có dấu đầy đủ trong headline, body, CTA và replyTemplate. Không được viết kiểu không dấu như 'uu dai', 'tu van', 'khach moi'.",
    "Mục tiêu: tạo bài viết có khả năng ra lịch hẹn, có muối, không hiền, không giống văn mẫu, không giống Google dịch.",
    "Dùng AIDA hoặc PAS: mở đầu bằng hook chạm vào nỗi sợ, mong muốn, hoặc sự tò mò; nêu lợi ích cụ thể; kết thúc bằng lời mời hành động rõ ràng.",
    "Headline phải có hook mạnh nhưng vẫn lịch sự: gợi sự tò mò, nỗi đau, kết quả mong muốn, hoặc tình huống đời thường. Tránh kiểu quảng cáo báo giấy.",
    "Tự động chèn 2-5 emoji phù hợp với làm đẹp/spa vào đầu dòng hoặc điểm nhấn. Dùng vừa đủ, không làm rối mắt.",
    "Nếu phù hợp, có thể dùng các emoji như ✨, 🌸, 💆, 🎁, 👇, 😳 nhưng không lặp lại quá nhiều.",
    "Không phóng đại y khoa, không cam kết điều trị khỏi bệnh, không nói quá sự thật.",
    "Body 90-160 từ, dễ đọc trên Facebook/Instagram, ưu tiên câu ngắn, có tính bản địa, có điểm nhấn bằng gạch đầu dòng nếu cần.",
    "CTA phải nói rõ hành động tiếp theo: nhắn tin, đặt lịch, giữ slot, hoặc nhận tư vấn.",
    "Reply template phải là mẫu trả lời inbox lịch sự, thân thiện, có hỏi nhu cầu/khung giờ.",
    "Hashtags gồm 3-5 hashtag liên quan đến spa, làm đẹp, dịch vụ và khu vực nếu có. Hashtag có thể không dấu hoặc camel case để dễ đọc.",
    "Trả kết quả bằng JSON thuần, KHÔNG markdown, KHÔNG code block, KHÔNG thêm chữ ngoài JSON.",
    "JSON cần đúng 5 key chính xác:",
    '{"headline":"...","body":"...","cta":"...","replyTemplate":"...","hashtags":["#LamDep","#SpaChuyenSau","#ChamSocDa"]}',
    `Tên spa: ${profile.businessName}`,
    `Ngành: ${profile.industry}`,
    `Thông điệp chính: ${profile.keyMessage || "Uy tín và tận tâm"}`,
    `Kênh đăng bài: ${input.channel}`,
    `Mục tiêu: ${input.goal}`,
    `Tệp khách: ${input.audience}`,
    `Dịch vụ: ${input.productOrService}`,
    `Cách viết mong muốn: ${selectedTone}`,
    `Ngôn ngữ: ${input.language || "vi"}`,
    `Ghi chú thêm: ${input.specialNote || "Không có"}`
  ].join("\n");
}

function getFallbackContent() {
  return {
    headline: "Da đang lên tiếng? Ưu đãi spa nhẹ nhàng cho khách mới",
    body: "✨ Spa đang có chương trình ưu đãi dành cho khách mới. Quy trình rõ ràng, tư vấn nhanh và đặt lịch linh hoạt để bạn dễ chọn khung giờ phù hợp.",
    cta: "👇 Nhắn tin ngay để được tư vấn và giữ lịch đẹp trong ngày.",
    replyTemplate: "Spa cảm ơn chị đã nhắn tin. Em gửi ngay bảng giá và lịch trống hôm nay để chị chọn khung giờ phù hợp ạ.",
    hashtags: ["#LamDep", "#SpaChuyenSau", "#ChamSocDa"]
  };
}

function normalizeField(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeHashtags(value, fallback = []) {
  const rawItems = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(/[\s,]+/)
        .filter(Boolean);

  const cleaned = rawItems
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => {
      const withoutSpaces = item.replace(/\s+/g, "");
      return withoutSpaces.startsWith("#") ? withoutSpaces : `#${withoutSpaces}`;
    })
    .filter((item) => /^#[\p{L}\p{N}_]+$/u.test(item))
    .slice(0, 5);

  return cleaned.length ? Array.from(new Set(cleaned)) : fallback;
}

function parseStructuredOutput(rawText) {
  const fallback = getFallbackContent();
  const clean = String(rawText ?? "").trim();
  if (!clean) return fallback;

  const unwrapped = clean.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const jsonMatch = unwrapped.match(/\{[\s\S]*\}/);

  const tryParse = (candidate) => {
    try {
      const parsed = JSON.parse(candidate);
      return {
        headline: normalizeField(parsed?.headline, fallback.headline),
        body: normalizeField(parsed?.body, fallback.body),
        cta: normalizeField(parsed?.cta, fallback.cta),
        replyTemplate: normalizeField(parsed?.replyTemplate ?? parsed?.reply, fallback.replyTemplate),
        hashtags: normalizeHashtags(parsed?.hashtags ?? parsed?.hashtag, fallback.hashtags)
      };
    } catch {
      return null;
    }
  };

  const parsedWhole = tryParse(unwrapped);
  if (parsedWhole) return parsedWhole;

  if (jsonMatch) {
    const parsedJson = tryParse(jsonMatch[0]);
    if (parsedJson) return parsedJson;
  }

  const lines = unwrapped.split("\n").map((line) => line.trim()).filter(Boolean);
  const byKey = {
    headline: "",
    body: "",
    cta: "",
    replyTemplate: "",
    hashtags: []
  };

  for (const line of lines) {
    const match = line.match(/^(headline|title|body|cta|reply|replytemplate|hashtags?)\s*:\s*(.+)$/i);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === "headline" || key === "title") byKey.headline = value;
    if (key === "body") byKey.body = value;
    if (key === "cta") byKey.cta = value;
    if (key === "reply" || key === "replytemplate") byKey.replyTemplate = value;
    if (key === "hashtag" || key === "hashtags") byKey.hashtags = normalizeHashtags(value, fallback.hashtags);
  }

  return {
    headline: normalizeField(byKey.headline, fallback.headline),
    body: normalizeField(byKey.body, fallback.body),
    cta: normalizeField(byKey.cta, fallback.cta),
    replyTemplate: normalizeField(byKey.replyTemplate, fallback.replyTemplate),
    hashtags: normalizeHashtags(byKey.hashtags, fallback.hashtags)
  };
}

function createProviderError(provider, code, message, status) {
  const error = new Error(message);
  error.provider = provider;
  error.code = code;
  error.status = status;
  return error;
}

function classifyProviderError(error) {
  const code = String(error?.code || "").toLowerCase();
  if (code) return code;

  const status = Number(error?.status || 0);
  if (status === 429) return "quota";
  if (status === 401 || status === 403) return "invalid_key";
  if (status >= 500) return "provider_error";

  const message = String(error?.message || "").toLowerCase();
  if (message.includes("resource_exhausted") || message.includes("quota")) return "quota";
  if (message.includes("rate limit")) return "rate_limit";
  if (message.includes("api key") || message.includes("invalid key") || message.includes("unauthorized")) return "invalid_key";
  if (message.includes("missing")) return "missing_key";
  if (message.includes("timeout")) return "timeout";
  if (message.includes("failed to fetch") || message.includes("network")) return "network";

  return "provider_error";
}

function getPublicNotice(reason) {
  switch (reason) {
    case "quota":
    case "rate_limit":
      return "He thong AI dang ban, da chuyen sang che do du phong de ban van thao tac duoc.";
    case "network":
    case "timeout":
      return "Ket noi AI dang cham hoac gian doan, da chuyen sang che do du phong.";
    case "invalid_key":
      return "Thong tin ket noi AI chua dung, he thong da chuyen sang che do du phong.";
    case "missing_key":
      return "He thong chua cau hinh du AI provider, da chuyen sang che do du phong.";
    default:
      return "He thong da chuyen sang che do du phong de khong gian doan cong viec.";
  }
}

function extractTextFromOpenAiLike(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
    if (joined) return joined;
  }

  return "";
}

function extractErrorMessage(data, rawText) {
  const fromJson =
    data?.error?.message ||
    data?.message ||
    data?.errors?.[0]?.message ||
    data?.result?.error ||
    "";
  const plain = String(rawText || "").trim();
  return String(fromJson || plain || "Unknown provider error").slice(0, 600);
}

async function postJson(url, payload, headers, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const rawText = await response.text();
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = null;
    }

    return { response, data, rawText };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Provider timeout.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiCompatibleProvider(providerId, { url, apiKey, model, prompt, timeoutMs, extraHeaders = {} }) {
  const { response, data, rawText } = await postJson(
    url,
    {
      model,
      temperature: 0.65,
      max_tokens: 620,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    },
    {
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders
    },
    timeoutMs
  );

  if (!response.ok) {
    const message = extractErrorMessage(data, rawText);
    throw createProviderError(providerId, classifyProviderError({ status: response.status, message }), message, response.status);
  }

  const outputText = extractTextFromOpenAiLike(data);
  if (!outputText) {
    throw createProviderError(providerId, "provider_error", "Provider returned empty content.");
  }

  return outputText;
}

async function callGeminiProvider(payload, timeoutMs) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const prompt = buildPrompt(payload);

  const { response, data, rawText } = await postJson(
    endpoint,
    {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    },
    {},
    timeoutMs
  );

  if (!response.ok) {
    const message = extractErrorMessage(data, rawText);
    throw createProviderError("gemini", classifyProviderError({ status: response.status, message }), message, response.status);
  }

  const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  if (!text) {
    throw createProviderError("gemini", "provider_error", "Gemini returned empty content.");
  }
  return text;
}

function buildProviderOrder() {
  const defaultOrder = ["groq", "cloudflare", "openrouter", "gemini"];
  const raw = String(env.AI_PROVIDER_ORDER || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const cleaned = [];
  for (const provider of raw.length ? raw : defaultOrder) {
    if (!["groq", "cloudflare", "openrouter", "gemini"].includes(provider)) continue;
    if (cleaned.includes(provider)) continue;
    cleaned.push(provider);
  }

  return cleaned.length ? cleaned : defaultOrder;
}

function buildProviders(payload, timeoutMs) {
  const prompt = buildPrompt(payload);
  const order = buildProviderOrder();
  const providers = [];

  for (const providerId of order) {
    if (providerId === "groq") {
      if (!env.GROQ_API_KEY) continue;
      providers.push({
        id: "groq",
        model: env.GROQ_MODEL,
        execute: () =>
          callOpenAiCompatibleProvider("groq", {
            url: "https://api.groq.com/openai/v1/chat/completions",
            apiKey: env.GROQ_API_KEY,
            model: env.GROQ_MODEL,
            prompt,
            timeoutMs
          })
      });
    }

    if (providerId === "cloudflare") {
      if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) continue;
      providers.push({
        id: "cloudflare",
        model: env.CLOUDFLARE_MODEL,
        execute: () =>
          callOpenAiCompatibleProvider("cloudflare", {
            url: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
            apiKey: env.CLOUDFLARE_API_TOKEN,
            model: env.CLOUDFLARE_MODEL,
            prompt,
            timeoutMs
          })
      });
    }

    if (providerId === "openrouter") {
      if (!env.OPENROUTER_API_KEY) continue;
      providers.push({
        id: "openrouter",
        model: env.OPENROUTER_MODEL,
        execute: () =>
          callOpenAiCompatibleProvider("openrouter", {
            url: "https://openrouter.ai/api/v1/chat/completions",
            apiKey: env.OPENROUTER_API_KEY,
            model: env.OPENROUTER_MODEL,
            prompt,
            timeoutMs,
            extraHeaders: {
              "HTTP-Referer": env.FRONTEND_URL,
              "X-Title": "Spa AI Studio"
            }
          })
      });
    }

    if (providerId === "gemini") {
      if (!env.GEMINI_API_KEY) continue;
      providers.push({
        id: "gemini",
        model: env.GEMINI_MODEL,
        execute: () => callGeminiProvider(payload, timeoutMs)
      });
    }
  }

  return providers;
}

function selectTopReason(failures) {
  if (!Array.isArray(failures) || failures.length === 0) return "provider_error";
  for (const reason of PROVIDER_PRIORITY) {
    if (failures.some((item) => item.code === reason)) return reason;
  }
  return "provider_error";
}

export async function generateSpaContent(payload) {
  const timeoutMs = Number(env.AI_REQUEST_TIMEOUT_MS) > 0 ? Number(env.AI_REQUEST_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
  const providers = buildProviders(payload, timeoutMs);

  if (!providers.length) {
    const configError = new Error("No AI provider configured.");
    configError.reason = "missing_key";
    configError.notice = getPublicNotice("missing_key");
    configError.failures = [];
    throw configError;
  }

  const failures = [];

  for (const provider of providers) {
    try {
      const rawText = await provider.execute();
      const content = parseStructuredOutput(rawText);
      return {
        content,
        provider: provider.id,
        model: provider.model
      };
    } catch (error) {
      const code = classifyProviderError(error);
      const status = Number(error?.status || 0) || null;
      const message = String(error?.message || "Provider error");
      failures.push({
        provider: provider.id,
        model: provider.model,
        code,
        status,
        message: message.slice(0, 240)
      });
      console.error(`[ai] provider ${provider.id} failed`, error);
    }
  }

  const topReason = selectTopReason(failures);
  const finalError = new Error("All AI providers failed.");
  finalError.reason = topReason;
  finalError.notice = getPublicNotice(topReason);
  finalError.failures = failures;
  throw finalError;
}
