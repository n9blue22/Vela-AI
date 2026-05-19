const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return null;
  }
  return email;
}

export function normalizeText(value, { min = 0, max = 255 } = {}) {
  const text = String(value ?? "").trim();
  if (text.length < min || text.length > max) {
    return null;
  }
  return text;
}

export function normalizeOptionalText(value, { max = 2000 } = {}) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (text.length > max) return null;
  return text;
}

export function isStrongPassword(value) {
  const password = String(value ?? "");
  if (password.length < 8 || password.length > 72) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  return hasLetter && hasDigit;
}

export function isValidUuid(value) {
  return UUID_REGEX.test(String(value ?? ""));
}

export function normalizeDateOnly(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!ISO_DATE_REGEX.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : raw;
}
