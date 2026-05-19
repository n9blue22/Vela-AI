import { Plan } from "../../types";

export type PaidPlan = Exclude<Plan, "mien_phi">;

export const paidPlanOrder: PaidPlan[] = ["tiet_kiem", "cao_cap"];

const PLAN_PRICE_VND: Record<PaidPlan, number> = {
  tiet_kiem: 250000,
  cao_cap: 499000
};

export const paymentBankConfig = {
  bankId: (import.meta.env.VITE_VIETQR_BANK_ID || "mbbank").trim(),
  bankLabel: (import.meta.env.VITE_VIETQR_BANK_LABEL || "MB Bank").trim(),
  accountNo: (import.meta.env.VITE_VIETQR_ACCOUNT_NO || "0339428018").trim(),
  accountName: (import.meta.env.VITE_VIETQR_ACCOUNT_NAME || "NGUYEN GIA BAO").trim(),
  customQrImageUrl: (import.meta.env.VITE_PAYMENT_QR_IMAGE_URL || "").trim()
};

export function isPaidPlan(plan: string | null | undefined): plan is PaidPlan {
  return plan === "tiet_kiem" || plan === "cao_cap";
}

export function getNextPaidPlan(currentPlan?: Plan | null): PaidPlan | null {
  if (!currentPlan || currentPlan === "mien_phi") return "tiet_kiem";
  if (currentPlan === "tiet_kiem") return "cao_cap";
  return null;
}

export function getPlanPriceVnd(plan: PaidPlan): number {
  return PLAN_PRICE_VND[plan];
}

export function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(value);
}

export function buildVietQrImageUrl(amount: number, transferContent: string): string {
  const bankId = encodeURIComponent(paymentBankConfig.bankId);
  const accountNo = encodeURIComponent(paymentBankConfig.accountNo);
  const addInfo = encodeURIComponent(transferContent);
  const accountName = encodeURIComponent(paymentBankConfig.accountName);

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
}

export function getPaymentQrImageUrl(amount: number, transferContent: string): string {
  if (paymentBankConfig.customQrImageUrl) {
    return paymentBankConfig.customQrImageUrl;
  }
  return buildVietQrImageUrl(amount, transferContent);
}
