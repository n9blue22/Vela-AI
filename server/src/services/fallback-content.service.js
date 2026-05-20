function normalizeText(value, fallback) {
  const clean = String(value ?? "").trim();
  return clean.length > 0 ? clean : fallback;
}

function channelCta(channel) {
  const value = String(channel ?? "").toLowerCase();
  if (value === "zalo") return "Nh\u1eafn Zalo \u0111\u1ec3 nh\u1eadn t\u01b0 v\u1ea5n v\u00e0 ch\u1ed1t l\u1ecbch nhanh.";
  if (value === "tiktok") return "\u0110\u1ec3 l\u1ea1i b\u00ecnh lu\u1eadn/inbox \u0111\u1ec3 nh\u1eadn \u01b0u \u0111\u00e3i h\u00f4m nay.";
  if (value === "google") return "G\u1ecdi ngay \u0111\u1ec3 \u0111\u01b0\u1ee3c gi\u1eef ch\u1ed7 khung gi\u1edd \u0111\u1eb9p trong ng\u00e0y.";
  return "Nh\u1eafn tin ngay \u0111\u1ec3 nh\u1eadn t\u01b0 v\u1ea5n v\u00e0 l\u1ecbch tr\u1ed1ng ph\u00f9 h\u1ee3p.";
}

export function generateFallbackSpaContent({ profile, input }) {
  const businessName = normalizeText(profile?.businessName, "Spa c\u1ee7a b\u1ea1n");
  const service = normalizeText(input?.productOrService, "li\u1ec7u tr\u00ecnh ch\u0103m s\u00f3c da");
  const audience = normalizeText(input?.audience, "kh\u00e1ch h\u00e0ng quan t\u00e2m l\u00e0m \u0111\u1eb9p");
  const goal = normalizeText(input?.goal, "t\u0103ng l\u1ecbch h\u1eb9n trong tu\u1ea7n");
  const note = normalizeText(input?.specialNote, "\u01b0u \u0111\u00e3i d\u00e0nh cho kh\u00e1ch m\u1edbi");
  const normalizedService = service
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join("");

  return {
    headline: `Da đang lên tiếng? ${businessName} có lịch chăm sóc riêng cho ${audience}`,
    body: `✨ Nhiều chị em chỉ thật sự chú ý đến làn da khi soi gương thấy da xạm, kém mịn hoặc mất sức sống.\n\nTại ${businessName}, ${service} được thiết kế để giúp bạn thư giãn, được tư vấn rõ ràng và có lộ trình phù hợp hơn. ${note ? `\n\n🎁 ${note}` : ""}\n\nMục tiêu của tuần này: ${goal}, nhưng vẫn giữ cách tư vấn nhẹ nhàng và dễ đặt lịch.`,
    cta: `\ud83d\udc47 ${channelCta(input?.channel)}`,
    replyTemplate: `Spa cảm ơn chị đã nhắn tin. Em hỏi nhanh mình đang quan tâm ${service} hay cần tư vấn tình trạng da trước ạ? Em gửi lịch trống hôm nay và mức ưu đãi hiện tại để chị chọn khung giờ phù hợp.`,
    hashtags: ["#LamDep", "#SpaChuyenSau", normalizedService ? `#${normalizedService}` : "#ChamSocDa"].slice(0, 5)
  };
}
