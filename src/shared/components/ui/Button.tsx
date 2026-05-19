import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primaryStrong",
  secondary: "border border-line bg-panel text-text hover:bg-panelAlt",
  ghost: "text-text hover:bg-panelAlt",
  danger: "bg-danger text-white hover:bg-danger/90"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-card px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});
