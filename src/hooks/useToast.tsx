import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "../shared/utils/cn";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setItems((prev) => [...prev.slice(-3), { id, message, tone }]);

    try {
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, 2800);
    } catch (error) {
      console.error("Toast timeout failed", error);
    }
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[320px] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-card border px-3 py-2 text-sm shadow-soft",
              item.tone === "success" && "border-success/30 bg-success/10 text-success",
              item.tone === "error" && "border-danger/30 bg-danger/10 text-danger",
              item.tone === "info" && "border-line bg-panel text-text"
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
