import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

interface BaseFieldProps {
  label: string;
  hint?: string;
}

type InputProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement>;
type SelectProps = BaseFieldProps & SelectHTMLAttributes<HTMLSelectElement>;
type TextareaProps = BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

const commonFieldClass =
  "w-full rounded-card border border-line bg-panel px-3 py-2 text-sm text-text outline-none transition placeholder:text-subtext/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25";

export function InputField({ label, hint, className, ...props }: InputProps) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-semibold text-text">{label}</span>
      <input className={cn(commonFieldClass, className)} {...props} />
      {hint ? <span className="text-xs text-subtext">{hint}</span> : null}
    </label>
  );
}

export function SelectField({ label, hint, className, children, ...props }: SelectProps) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-semibold text-text">{label}</span>
      <select className={cn(commonFieldClass, className)} {...props}>
        {children}
      </select>
      {hint ? <span className="text-xs text-subtext">{hint}</span> : null}
    </label>
  );
}

export function TextAreaField({ label, hint, className, ...props }: TextareaProps) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-semibold text-text">{label}</span>
      <textarea className={cn(commonFieldClass, "min-h-28 resize-y", className)} {...props} />
      {hint ? <span className="text-xs text-subtext">{hint}</span> : null}
    </label>
  );
}
