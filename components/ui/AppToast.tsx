"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckIcon, XIcon, InfoIcon } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

export interface ToastData {
  id: string;
  kind?: ToastKind;
  ttl: string;
  sub?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastData[];
  push: (toast: Omit<ToastData, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const push = useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      const updated = [...prev, { ...toast, id }];
      return updated.slice(-3);
    });

    const duration = toast.duration || 3400;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed right-3.5 bottom-3.5 left-3.5 z-[99999] flex flex-col gap-2 pointer-events-none md:left-auto md:w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-2.5 p-3 px-3.5 rounded-[10px] border-2 border-ink shadow-[4px_4px_0_var(--color-ink)] bg-white relative overflow-hidden animate-[toast-in_0.42s_cubic-bezier(0.175,0.885,0.32,1.275)]"
        >
          {toast.kind === "success" && (
            <div className="w-[26px] h-[26px] shrink-0 rounded-full border-2 border-ink flex items-center justify-center bg-grass text-white">
              <CheckIcon size={14} strokeWidth={3} />
            </div>
          )}
          {toast.kind === "error" && (
            <div className="w-[26px] h-[26px] shrink-0 rounded-full border-2 border-ink flex items-center justify-center bg-coral text-white">
              <XIcon size={14} strokeWidth={3} />
            </div>
          )}
          {toast.kind === "info" && (
            <div className="w-[26px] h-[26px] shrink-0 rounded-full border-2 border-ink flex items-center justify-center bg-sky text-white">
              <InfoIcon size={14} strokeWidth={3} />
            </div>
          )}
          {/* Default fallback if no kind or unknown kind */}
          {!toast.kind && (
            <div className="w-[26px] h-[26px] shrink-0 rounded-full border-2 border-ink flex items-center justify-center bg-butter text-ink">
              <InfoIcon size={14} strokeWidth={3} />
            </div>
          )}

          <div className="flex-1 pt-0.5">
            <div className="text-xs font-bold text-ink">{toast.ttl}</div>
            {toast.sub && <div className="text-[11px] text-ink-2 mt-0.5">{toast.sub}</div>}
          </div>

          <div
            className="absolute left-0 bottom-0 h-[3px] bg-ink"
            style={{ animation: `prog ${toast.duration || 3400}ms linear forwards` }}
          />
        </div>
      ))}
    </div>
  );
}
