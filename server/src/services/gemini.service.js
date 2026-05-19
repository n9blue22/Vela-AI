import { env } from "../config/env.js";

function parseOutput(raw) {
  const fallback = {
    headline: "Ưu đãi spa trong tuần dành cho khách mới",
    body: "Trải nghiệm chăm sóc da thư giãn với quy trình chuẩn spa, đặt lịch nhanh và hỗ trợ tận tâm.",
    cta: "Nhắn tin ngay để nhận tư vấn gói phù hợp.",
    replyTemplate: "Spa cảm ơn chị đã nhắn tin. Em gửi ngay bảng giá và khung giờ trống hôm nay ạ."
  };

  try {
    const lines = String(raw).split("\n");
    const headline = lines.find((line) => line.toLowerCase().startsWith("headline:"))?.split(":").slice(1).join(":").trim();
    const body = lines.find((line) => line.toLowerCase().startsWith("body:"))?.split(":").slice(1).join(":").trim();
    const cta = lines.find((line) => line.toLowerCase().startsWith("cta:"))?.split(":").slice(1).join(":").trim();
    const replyTemplate = lines.find((line) => line.toLowerCase().startsWith("reply:"))?.split(":").slice(1).join(":").trim();

    return {
      headline: headline || fallback.headline,
      body: body || fallback.body,
      cta: cta || fallback.cta,
      replyTemplate: replyTemplate || fallback.replyTemplate
    };
  } catch (error) {
    console.error("[gemini] parseOutput failed", error);
    return fallback;
  }
}

function buildPrompt({ profile, input }) {
  return [
    "Bạn là chuyên gia marketing spa tại Việt Nam.",
    "Hãy viết nội dung dễ hiểu, chốt khách nhanh và tự nhiên.",
    `Tên spa: ${profile.businessName}`,
    `Ngành: ${profile.industry}`,
    `Tệp khách: ${input.audience}`,
    `Dịch vụ: ${input.productOrService}`,
    `Kênh: ${input.channel}`,
    `Mục tiêu: ${input.goal}`,
    `Giọng điệu: ${input.tone}`,
    `Ngôn ngữ: ${input.language}`,
    `Ghi chú: ${input.specialNote}`,
    "Trả đúng 4 dòng định dạng:",
    "Headline: ...",
    "Body: ...",
    "CTA: ...",
    "Reply: ..."
  ].join("\n");
}

export async function generateSpaContent(payload) {
  if (!env.GEMINI_API_KEY) {
    throw new Error("Thiếu GEMINI_API_KEY trên server.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(payload) }]
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API lỗi ${response.status}: ${errorText.slice(0, 500)}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!rawText.trim()) {
      throw new Error("Gemini trả về rỗng.");
    }

    return parseOutput(rawText);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Gemini timeout.");
    }
    console.error("[gemini] generateSpaContent failed", error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
