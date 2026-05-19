import { PropsWithChildren } from "react";
import { cn } from "../../utils/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

interface BadgeProps extends PropsWithChildren {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-line bg-panelAlt text-subtext",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger"
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={cn("inline-flex rounded px-2 py-1 text-xs font-semibold", toneClasses[tone])}>{children}</span>;
}

