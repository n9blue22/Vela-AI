import { cn } from "../../utils/cn";

interface AppBrandProps {
  className?: string;
  logoClassName?: string;
  markOnly?: boolean;
  compact?: boolean;
  showTagline?: boolean;
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 140" aria-hidden="true" className={cn("h-14 w-14", className)}>
      <rect x="1.5" y="1.5" width="137" height="137" rx="28" fill="#1a0f16" stroke="#4d2132" strokeWidth="3" />
      <circle cx="91" cy="37" r="9" fill="#dc6d8f" />
      <circle cx="91" cy="37" r="17" fill="none" stroke="#8c3f58" strokeWidth="3" />
      <line x1="61" y1="30" x2="61" y2="87" stroke="#a78f9b" strokeWidth="4" strokeLinecap="round" />
      <polygon points="42,30 67,96 42,96" fill="#d67b97" />
      <polygon points="66,43 100,83 66,96" fill="#ddc0d0" />
      <rect x="28" y="98" width="74" height="8" rx="4" fill="#e9c9d7" />
    </svg>
  );
}

export function AppBrand({
  className,
  logoClassName,
  markOnly = false,
  compact = false,
  showTagline = true
}: AppBrandProps) {
  if (markOnly) {
    return <BrandMark className={cn("h-14 w-14", logoClassName)} />;
  }

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark className={cn(compact ? "h-11 w-11" : "h-14 w-14", logoClassName)} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-serif text-3xl font-semibold uppercase tracking-[0.2em] text-[#e7bfd0]", compact && "text-2xl")}>
            VELA
          </span>
          <span className={cn("rounded-full border border-[#c94d73] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#de6b91]", compact && "text-[10px]")}>
            AI
          </span>
        </div>
        {showTagline ? (
          <p className={cn("mt-1 text-[11px] font-medium uppercase tracking-[0.34em] text-subtext", compact && "text-[10px] tracking-[0.28em]")}>
            Spa Marketing
          </p>
        ) : null}
      </div>
    </div>
  );
}

