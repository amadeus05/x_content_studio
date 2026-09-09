import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface StudioSelectOption {
  id: string;
  label: string;
  color?: string;
  /** Короткий лейбл для compact-триггера (без эмодзи) */
  triggerLabel?: string;
  /** Класс точки статуса, напр. bg-amber-400 */
  dotClass?: string;
}

interface StudioSelectProps {
  value: string;
  options: StudioSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  fullWidth?: boolean;
  compact?: boolean;
  count?: number;
  "aria-label"?: string;
}

export const StudioSelect: React.FC<StudioSelectProps> = ({
  value,
  options,
  onChange,
  className = "",
  fullWidth = false,
  compact = false,
  count,
  "aria-label": ariaLabel
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.id === value) || options[0];
  const longestLabel = options.reduce(
    (best, opt) => (opt.label.length > best.length ? opt.label : best),
    active?.label || ""
  );
  const triggerText = active?.triggerLabel || active?.label || "";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (compact) {
    return (
      <div ref={rootRef} className={`relative ${fullWidth ? "w-full" : "min-w-0"} ${className}`}>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((v) => !v)}
          className={`w-full h-8 flex items-center justify-between gap-2 px-2.5 rounded-lg bg-surface-850 hover:bg-surface-800 border text-xs font-medium text-left transition-colors ${
            open ? "border-brand-500" : "border-surface-750"
          }`}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${active?.dotClass || "bg-slate-400"}`}
              aria-hidden
            />
            <span className={`truncate font-semibold ${active?.color || "text-slate-200"}`}>
              {triggerText}
            </span>
            {typeof count === "number" && (
              <span className="text-[10px] text-slate-500 font-mono tabular-nums shrink-0">
                ({count})
              </span>
            )}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute left-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-surface-750 bg-surface-900 shadow-2xl shadow-black overflow-hidden"
          >
            <div className="p-1.5 max-h-64 overflow-y-auto">
              {options.map((opt) => {
                const isOn = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isOn}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between w-full gap-3 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                      isOn
                        ? "bg-brand-500/10 text-white font-semibold"
                        : "text-slate-300 hover:bg-surface-800 hover:text-white"
                    }`}
                  >
                    <span className={`flex items-center gap-2 min-w-0 ${isOn ? "" : opt.color || ""}`}>
                      {opt.dotClass ? (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`} aria-hidden />
                      ) : null}
                      <span className="truncate font-medium">{opt.label}</span>
                    </span>
                    {isOn && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? "w-full" : "w-max"} ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center bg-surface-850 hover:bg-surface-800 border rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-semibold text-left transition-colors ${
          fullWidth ? "w-full" : ""
        } ${
          open ? "border-brand-500" : "border-surface-750 focus:border-brand-500"
        } ${active?.color || "text-slate-200"}`}
      >
        {!fullWidth && (
          <span className="invisible whitespace-nowrap pointer-events-none select-none" aria-hidden>
            {longestLabel}
          </span>
        )}
        <span
          className={`truncate ${
            fullWidth ? "" : "absolute inset-y-0 left-2.5 right-8 flex items-center"
          }`}
        >
          {active?.label}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 pointer-events-none">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute z-50 mt-1 rounded-xl border border-surface-750 bg-surface-900 shadow-xl shadow-black/50 overflow-hidden ${
            fullWidth ? "w-full" : "min-w-full left-0"
          }`}
        >
          <div className="p-1 max-h-64 overflow-y-auto">
            {options.map((opt) => {
              const isOn = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isOn}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between w-full gap-3 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                    isOn
                      ? "bg-brand-500/15 text-white"
                      : "text-slate-300 hover:bg-surface-850 hover:text-white"
                  }`}
                >
                  <span className={`truncate font-medium ${isOn ? "" : opt.color || ""}`}>
                    {opt.label}
                  </span>
                  {isOn && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
