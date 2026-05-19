import { CheckCircle2, QrCode, X } from "lucide-react";
import { Button } from "../../shared/components/ui/Button";
import { PaidPlan, formatVnd, paidPlanOrder, paymentBankConfig } from "../../shared/constants/billing";
import { planLabel } from "../../shared/constants/plans";
import { Plan } from "../../types";

interface UpgradePlanModalProps {
  open: boolean;
  currentPlan?: Plan;
  selectedPlan: PaidPlan;
  amountVnd: number;
  transferContent: string;
  qrImageUrl: string;
  confirming: boolean;
  onSelectPlan: (plan: PaidPlan) => void;
  onClose: () => void;
  onConfirmPaid: () => void;
}

export function UpgradePlanModal({
  open,
  currentPlan,
  selectedPlan,
  amountVnd,
  transferContent,
  qrImageUrl,
  confirming,
  onSelectPlan,
  onClose,
  onConfirmPaid
}: UpgradePlanModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[760px] rounded-card border border-line bg-panel p-4 shadow-soft md:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Đang nâng cấp lên</p>
            <h2 className="mt-1 text-3xl font-extrabold text-text">{planLabel(selectedPlan)}</h2>
            <p className="mt-2 text-4xl font-extrabold text-primary">
              {formatVnd(amountVnd)}
              <span className="ml-1 text-base font-semibold text-subtext">/ tháng</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-line bg-panelAlt text-subtext hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 inline-flex rounded-full border border-line bg-panelAlt p-1">
          {paidPlanOrder.map((planId) => {
            const selected = selectedPlan === planId;
            return (
              <button
                key={planId}
                type="button"
                onClick={() => onSelectPlan(planId)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selected ? "bg-primary text-white" : "text-subtext hover:bg-panel"
                }`}
              >
                {planLabel(planId)}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
          <div className="rounded-card border border-line bg-panelAlt p-3">
            <img src={qrImageUrl} alt="Mã QR chuyển khoản VietQR" className="w-full rounded-card border border-line bg-white object-cover p-2" />
            <p className="mt-3 rounded-full border border-line bg-panel px-3 py-2 text-center text-sm font-semibold text-subtext">
              VietQR · {paymentBankConfig.bankLabel}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-card border border-dashed border-line bg-panelAlt p-3">
              <p className="text-sm text-subtext">
                Nội dung chuyển khoản (đã điền sẵn trong QR):{" "}
                <span className="font-extrabold tracking-wide text-primary">{transferContent}</span>
              </p>
            </div>

            <ol className="grid gap-2 pl-5 text-sm text-subtext">
              <li>Mở ứng dụng ngân hàng và quét mã QR.</li>
              <li>Số tiền được điền tự động: {formatVnd(amountVnd)}.</li>
              <li>Giữ nguyên nội dung chuyển khoản để hệ thống đối soát nhanh.</li>
              <li>Nhấn “Tôi đã chuyển tiền” sau khi thanh toán xong.</li>
            </ol>

            {currentPlan === selectedPlan ? (
              <p className="rounded-card border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                Bạn đang dùng đúng gói này.
              </p>
            ) : null}

            <Button
              onClick={onConfirmPaid}
              disabled={confirming || currentPlan === selectedPlan}
              className="min-h-12 text-base font-extrabold"
            >
              <CheckCircle2 size={18} />
              {confirming ? "Đang ghi nhận..." : "Tôi đã chuyển tiền"}
            </Button>

            <p className="inline-flex items-center gap-2 text-xs text-subtext">
              <QrCode size={14} />
              Sau khi xác nhận, admin sẽ kiểm tra và nâng cấp gói cho tài khoản của bạn.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
