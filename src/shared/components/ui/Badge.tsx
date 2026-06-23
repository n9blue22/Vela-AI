import { PropsWithChildren } from "react";
import { cn } from "../../utils/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

interface BadgeProps extends PropsWithChildren {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-white/[0.08] bg-white/[0.04] text-subtext",
  success: "border-success/[0.18] bg-success/[0.12] text-success",
  warning: "border-warning/[0.18] bg-warning/[0.12] text-warning",
  danger: "border-danger/[0.18] bg-danger/[0.12] text-danger"
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", toneClasses[tone])}>
      {children}
    </span>
  );
}
