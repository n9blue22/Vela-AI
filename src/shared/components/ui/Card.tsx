import { PropsWithChildren } from "react";
import { cn } from "../../utils/cn";

interface CardProps extends PropsWithChildren {
  className?: string;
}

export function Card({ className, children }: CardProps) {
  return (
    <section
      className={cn(
        "min-w-0 max-w-full content-start overflow-hidden rounded-card border border-white/10 bg-panel/88 p-4 shadow-soft backdrop-blur-xl animate-fade-up [&>*]:min-w-0",
        className
      )}
    >
      {children}
    </section>
  );
}
