import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, Tag } from "lucide-react";

interface TagFilterProps {
  tags: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  compact?: boolean;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  tags,
  selected,
  onChange,
  compact = false
}) => {
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

  const hasSelected = selected.length > 0;

  return (
    <div ref={rootRef} className={`relative ${compact ? "shrink-0" : ""}`}>
      <button
        type="button"
        title={hasSelected ? selected.map((t) => `#${t}`).join(", ") : "Фильтр по тегам"}
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? `h-8 px-2.5 flex items-center gap-0.5 rounded-lg bg-surface-850 hover:bg-surface-800 border text-xs font-medium transition-colors ${
                hasSelected
                  ? "border-brand-500/40 text-brand-400"
                  : "border-surface-750 text-slate-400"
              }`
            : `flex items-center w-full h-8 bg-surface-850 hover:bg-surface-800 border border-surface-750 rounded-lg pl-2.5 text-xs text-left focus:outline-none focus:border-brand-500 ${
                hasSelected ? "pr-8" : "pr-8"
              }`
        }
      >
        {compact ? (
          <>
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="relative inline-flex items-center justify-center min-w-[2rem] h-4">
              <span
                className={`text-xs font-medium ${hasSelected ? "invisible" : ""}`}
                aria-hidden={hasSelected}
              >
                Теги
              </span>
              {hasSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="min-w-4 h-4 px-1 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                    {selected.length}
                  </span>
                </span>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="text-slate-500 mr-1.5 shrink-0">#</span>
            {hasSelected ? (
              <span className="flex items-center gap-1 min-w-0">
                <span className="truncate text-brand-400 font-medium">#{selected[0]}</span>
                {selected.length > 1 && (
                  <span className="shrink-0 text-[10px] font-semibold text-brand-400 bg-brand-500/15 border border-brand-500/30 px-1.5 py-0.5 rounded-full">
                    +{selected.length - 1}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400 truncate">Все теги</span>
            )}
          </>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1.5 rounded-xl border border-surface-750 bg-surface-900 shadow-2xl shadow-black overflow-hidden ${
            compact ? "right-0 w-60" : "left-0 w-full"
          }`}
        >
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-surface-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Фильтр по тегам
            </span>
            {hasSelected && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-brand-400 hover:underline"
              >
                Сбросить
              </button>
            )}
          </div>

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

          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
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
                    className={`flex items-center justify-between w-full gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                      isOn ? "bg-surface-800 text-brand-400" : "text-slate-200 hover:bg-surface-800"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`flex items-center justify-center size-3.5 rounded border shrink-0 ${
                          isOn
                            ? "bg-brand-500 border-brand-500 text-white"
                            : "border-surface-700 bg-surface-950"
                        }`}
                      >
                        {isOn && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                      </span>
                      <span className={`truncate ${isOn ? "font-medium text-brand-400" : ""}`}>
                        #{tag}
                      </span>
                    </span>
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
