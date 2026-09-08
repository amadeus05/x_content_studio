import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

interface TagFilterProps {
  tags: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({ tags, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().replace(/^#/, "").toLowerCase();
    const list = q ? tags.filter((t) => t.toLowerCase().includes(q)) : tags;
    return [...list].sort((a, b) => {
      const aSel = selected.includes(a) ? 0 : 1;
      const bSel = selected.includes(b) ? 0 : 1;
      return aSel - bSel || a.localeCompare(b, "ru");
    });
  }, [tags, query, selected]);

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center w-full h-8 bg-surface-850 hover:bg-surface-800 border border-surface-750 rounded-lg pl-2.5 text-xs text-left focus:outline-none focus:border-brand-500 ${
          selected.length > 0 ? "pr-12" : "pr-8"
        }`}
      >
        <span className="text-slate-500 mr-1.5 shrink-0">#</span>
        {selected.length === 0 ? (
          <span className="text-slate-400 truncate">Все теги</span>
        ) : (
          <span className="flex items-center gap-1 min-w-0">
            <span className="truncate text-brand-400 font-medium">#{selected[0]}</span>
            {selected.length > 1 && (
              <span className="shrink-0 text-[10px] font-semibold text-brand-400 bg-brand-500/15 border border-brand-500/30 px-1.5 py-0.5 rounded-full">
                +{selected.length - 1}
              </span>
            )}
          </span>
        )}
        <span className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 pointer-events-none">
          <ChevronDown className="w-3.5 h-3.5" />
        </span>
      </button>

      {selected.length > 0 && (
        <button
          type="button"
          title="Сбросить теги"
          onClick={(e) => {
            e.stopPropagation();
            onChange([]);
          }}
          className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-rose-400"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {open && (
        <div className="absolute z-40 mt-1 w-full rounded-lg border border-surface-750 bg-surface-900 shadow-xl shadow-black/40 overflow-hidden">
          <div className="p-1.5 border-b border-surface-800">
            <div className="flex items-center h-8 px-2 rounded-md bg-surface-950 border border-surface-800 focus-within:border-brand-500">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Найти тег..."
                className="w-full bg-transparent border-none px-2 py-0 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-4 text-center text-[11px] text-slate-500">Ничего не найдено</div>
            ) : (
              filtered.map((tag) => {
                const isOn = selected.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    className={`flex items-center w-full gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors ${
                      isOn ? "bg-brand-500/10 text-brand-400" : "text-slate-300 hover:bg-surface-850"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center size-3.5 rounded border shrink-0 ${
                        isOn ? "bg-brand-500 border-brand-500 text-white" : "border-surface-700 bg-surface-950"
                      }`}
                    >
                      {isOn && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                    </span>
                    <span className="truncate">#{tag}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-2.5 py-1.5 border-t border-surface-800 text-[10px] text-slate-500">
            Можно выбрать несколько — покажем посты со всеми этими тегами
          </div>
        </div>
      )}
    </div>
  );
};
