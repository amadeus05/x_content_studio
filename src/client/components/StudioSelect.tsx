import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface StudioSelectOption {
  id: string;
  label: string;
  color?: string;
}

interface StudioSelectProps {
  value: string;
  options: StudioSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  fullWidth?: boolean;
  "aria-label"?: string;
}

export const StudioSelect: React.FC<StudioSelectProps> = ({
  value,
  options,
  onChange,
  className = "",
  fullWidth = false,
  "aria-label": ariaLabel
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.id === value) || options[0];
  const longestLabel = options.reduce(
    (best, opt) => (opt.label.length > best.length ? opt.label : best),
    active?.label || ""
  );

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
