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

  return {
    headline: `${businessName}: \u01afu \u0111\u00e3i ${service} cho ${audience}`,
    body: `${businessName} \u0111ang tri\u1ec3n khai ch\u01b0\u01a1ng tr\u00ecnh ${note}. N\u1ed9i dung t\u1eadp trung m\u1ee5c ti\u00eau ${goal}, quy tr\u00ecnh r\u00f5 r\u00e0ng, t\u01b0 v\u1ea5n nhanh v\u00e0 d\u1ec5 \u0111\u1eb7t l\u1ecbch.`,
    cta: channelCta(input?.channel),
    replyTemplate: `Spa c\u1ea3m \u01a1n ch\u1ecb \u0111\u00e3 nh\u1eafn tin. Em g\u1eedi ngay th\u00f4ng tin ${service}, m\u1ee9c \u01b0u \u0111\u00e3i hi\u1ec7n t\u1ea1i v\u00e0 khung gi\u1edd tr\u1ed1ng h\u00f4m nay \u0111\u1ec3 ch\u1ecb ch\u1ecdn nhanh \u1ea1.`
  };
}
