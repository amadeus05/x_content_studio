import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Edit2, Check, Zap, X } from "lucide-react";
import { PostVariantDto } from "../../modules/content/application/dtos/PostDto.ts";

interface VariantTabsProps {
  variants: PostVariantDto[];
  activeVariantId: string;
  onSelectVariant: (variantId: string) => void;
  onAddVariant: (label?: string) => void;
  onDeleteVariant: (variantId: string) => void;
  onUpdateLabel: (variantId: string, label: string) => void;
}

export const VariantTabs: React.FC<VariantTabsProps> = ({
  variants,
  activeVariantId,
  onSelectVariant,
  onAddVariant,
  onDeleteVariant,
  onUpdateLabel
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startScroll: 0,
    dragging: false,
    skipClick: false
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (dragRef.current.pointerId !== e.pointerId) return;
      const el = scrollerRef.current;
      if (!el) return;
      const dx = e.clientX - dragRef.current.startX;
      if (!dragRef.current.dragging && Math.abs(dx) < 16) return;
      dragRef.current.dragging = true;
      dragRef.current.skipClick = true;
      setDragging(true);
      window.getSelection()?.removeAllRanges();
      e.preventDefault();
      el.scrollLeft = dragRef.current.startScroll - dx;
    };

    const onUp = (e: PointerEvent) => {
      if (dragRef.current.pointerId !== e.pointerId) return;
      dragRef.current.pointerId = -1;
      dragRef.current.dragging = false;
      setDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const startEdit = (v: PostVariantDto) => {
    setEditingId(v.id);
    setLabelInput(v.variantLabel);
  };

  const saveEdit = (variantId: string) => {
    if (labelInput.trim()) {
      onUpdateLabel(variantId, labelInput.trim());
    }
    setEditingId(null);
  };

  const selectVariant = (id: string) => {
    if (dragRef.current.skipClick) {
      dragRef.current.skipClick = false;
      return;
    }
    onSelectVariant(id);
  };

  return (
    <div className="flex items-center justify-between bg-surface-900/70 p-2 rounded-xl border border-surface-800 gap-3">
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <span className="text-xs font-bold uppercase tracking-wider text-ai-400 flex items-center space-x-1.5 px-2 shrink-0">
          <Zap className="w-3.5 h-3.5" />
          <span>Хуки / Варианты:</span>
        </span>
        <div
          ref={scrollerRef}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse" || e.button !== 0) return;
            const el = scrollerRef.current;
            if (!el || (e.target as HTMLElement).closest("input, textarea, button")) return;
            window.getSelection()?.removeAllRanges();
            dragRef.current = {
              pointerId: e.pointerId,
              startX: e.clientX,
              startScroll: el.scrollLeft,
              dragging: false,
              skipClick: false
            };
          }}
          className={`flex items-center space-x-1 min-w-0 flex-1 bg-surface-950 p-1 rounded-lg border border-surface-800 overflow-x-auto touch-pan-x select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {variants.map((v) => {
            const isActive = v.id === activeVariantId;

            if (editingId === v.id) {
              return (
                <div key={v.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-850 border border-surface-750 shrink-0">
                  <input
                    type="text"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(v.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="bg-transparent text-xs text-white outline-none w-24 select-text px-1"
                  />
                  <button
                    type="button"
                    title="Отмена"
                    onClick={() => setEditingId(null)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-surface-800 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Сохранить название"
                    onClick={() => saveEdit(v.id)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-100 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 shadow-sm transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>Готово</span>
                  </button>
                </div>
              );
            }

            return (
              <div
                key={v.id}
                role="button"
                tabIndex={0}
                onClick={() => selectVariant(v.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectVariant(v.id);
                  }
                }}
                className={`group flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-xs shrink-0 cursor-pointer ${
                  isActive
                    ? "font-semibold bg-brand-500 text-white shadow-sm"
                    : "font-medium text-slate-400 hover:text-slate-200 hover:bg-surface-850"
                }`}
              >
                <span>{v.variantLabel}</span>
                <span className={`text-[10px] ${isActive ? "opacity-80 font-normal" : "opacity-70"}`}>
                  {v.charCount} зн.
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 ml-0.5 ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <button
                    type="button"
                    title="Переименовать"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(v);
                    }}
                    className={`p-[2px] rounded border transition-colors ${
                      isActive
                        ? "text-white/85 border-white/20 bg-white/10 hover:text-amber-300 hover:bg-amber-500/35 hover:border-amber-300/70"
                        : "text-slate-400 border-surface-700/80 bg-surface-900/60 hover:text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/10"
                    }`}
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      title="Удалить"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteVariant(v.id);
                      }}
                      className={`p-[2px] rounded border transition-colors ${
                        isActive
                          ? "text-white/85 border-white/20 bg-white/10 hover:text-rose-100 hover:bg-rose-500/55 hover:border-rose-300/80"
                          : "text-slate-400 border-surface-700/80 bg-surface-900/60 hover:text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/10"
                      }`}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAddVariant(`Вариант ${variants.length + 1}`)}
        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-brand-400 hover:bg-brand-500/10 border border-transparent hover:border-brand-500/20 transition-all shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Новый вариант</span>
      </button>
    </div>
  );
};
