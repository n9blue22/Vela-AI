import { PropsWithChildren } from "react";
import { cn } from "../../utils/cn";

interface CardProps extends PropsWithChildren {
  className?: string;
}

export function Card({ className, children }: CardProps) {
  return (
    <section
      className={cn(
        "min-w-0 max-w-full overflow-hidden rounded-card border border-line bg-panel/95 p-4 shadow-soft backdrop-blur-sm animate-fade-up [&>*]:min-w-0",
        className
      )}
    >
      {children}
    </section>
  );
}
