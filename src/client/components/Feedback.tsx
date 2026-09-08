import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastKind = "error" | "success" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  resolve: (ok: boolean) => void;
}

interface FeedbackApi {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  error: (title: string, err?: unknown) => void;
  success: (title: string, message?: string) => void;
  confirm: (opts: { title: string; message: string; confirmLabel?: string }) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function formatApiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "Неизвестная ошибка");
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error === "string") return parsed.error;
    if (typeof parsed?.message === "string") return parsed.message;
  } catch {
    /* plain text */
  }
  return raw;
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback вне FeedbackProvider");
  return ctx;
}

const kindUi: Record<ToastKind, { icon: typeof Info; wrap: string; iconColor: string }> = {
  error: {
    icon: AlertTriangle,
    wrap: "border-rose-500/30 bg-surface-900",
    iconColor: "text-rose-400"
  },
  success: {
    icon: CheckCircle2,
    wrap: "border-emerald-500/30 bg-surface-900",
    iconColor: "text-emerald-400"
  },
  info: {
    icon: Info,
    wrap: "border-brand-500/30 bg-surface-900",
    iconColor: "text-brand-400"
  }
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, kind, title, message }]);
    window.setTimeout(() => dismiss(id), 5200);
  }, [dismiss]);

  const error = useCallback(
    (title: string, err?: unknown) => {
      toast("error", title, err !== undefined ? formatApiError(err) : undefined);
    },
    [toast]
  );

  const success = useCallback(
    (title: string, message?: string) => toast("success", title, message),
    [toast]
  );

  const confirm = useCallback((opts: { title: string; message: string; confirmLabel?: string }) => {
    return new Promise<boolean>((resolve) => {
      setConfirmReq({ ...opts, resolve });
    });
  }, []);

  const api = useMemo(() => ({ toast, error, success, confirm }), [toast, error, success, confirm]);

  const closeConfirm = (ok: boolean) => {
    confirmReq?.resolve(ok);
    setConfirmReq(null);
  };

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      <div className="fixed top-4 right-4 z-[80] flex flex-col gap-2 w-[min(100%-2rem,22rem)] pointer-events-none">
        {toasts.map((item) => {
          const ui = kindUi[item.kind];
          const Icon = ui.icon;
          return (
            <div
              key={item.id}
              className={`pointer-events-auto rounded-xl border shadow-xl shadow-black/40 px-3.5 py-3 ${ui.wrap}`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${ui.iconColor}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white">{item.title}</div>
                  {item.message && (
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.message}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="text-slate-500 hover:text-slate-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmReq && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-750 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{confirmReq.title}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{confirmReq.message}</p>
              </div>
            </div>
            <div className="px-5 py-4 flex items-center justify-end gap-2 border-t border-surface-800">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-surface-850 hover:bg-surface-800 border border-surface-750"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500"
              >
                {confirmReq.confirmLabel || "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};
