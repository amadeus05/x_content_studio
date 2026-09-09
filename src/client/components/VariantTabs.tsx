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

  const chipClass =
    "box-border flex items-center gap-1.5 h-7 px-3 rounded-md text-xs shrink-0 border";

  return (
    <div className="box-border flex h-[51px] items-center justify-between overflow-hidden bg-surface-900/70 p-2 rounded-xl border border-surface-800 gap-3">
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
          className={`flex items-center gap-1 min-w-0 flex-1 h-[35px] bg-surface-950 p-1 rounded-lg border border-surface-800 overflow-x-auto overflow-y-hidden touch-pan-x select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden box-border ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {variants.map((v) => {
            const isActive = v.id === activeVariantId;

            if (editingId === v.id) {
              return (
                <div key={v.id} className={`${chipClass} bg-surface-850 border-surface-750`}>
                  <input
                    type="text"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(v.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onFocus={(e) => e.currentTarget.select()}
                    autoFocus
                    className="bg-transparent text-xs text-white outline-none border-0 p-0 m-0 w-24 h-4 leading-4 select-text shadow-none"
                  />
                  <button
                    type="button"
                    title="Отмена"
                    onClick={() => setEditingId(null)}
                    className="grid size-4 place-items-center rounded text-slate-400 hover:text-slate-200 hover:bg-surface-800 transition-colors"
                  >
                    <X className="size-2.5" />
                  </button>
                  <button
                    type="button"
                    title="Сохранить название"
                    onClick={() => saveEdit(v.id)}
                    className="inline-flex items-center gap-0.5 h-4 px-1.5 rounded text-[10px] font-semibold leading-none text-emerald-100 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 transition-colors"
                  >
                    <Check className="size-2.5" />
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
                className={`group ${chipClass} cursor-pointer ${
                  isActive
                    ? "font-semibold bg-brand-500 text-white border-transparent shadow-sm"
                    : "font-medium text-slate-400 border-transparent hover:text-slate-200 hover:bg-surface-850"
                }`}
              >
                <span>{v.variantLabel}</span>
                <span className={`text-[10px] ${isActive ? "opacity-80 font-normal" : "opacity-70"}`}>
                  {v.charCount} зн.
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 ${
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
                    className={`grid size-4 place-items-center rounded border transition-colors ${
                      isActive
                        ? "text-white/85 border-white/20 bg-white/10 hover:text-amber-300 hover:bg-amber-500/35 hover:border-amber-300/70"
                        : "text-slate-400 border-surface-700/80 bg-surface-900/60 hover:text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/10"
                    }`}
                  >
                    <Edit2 className="size-2.5" />
                  </button>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      title="Удалить"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteVariant(v.id);
                      }}
                      className={`grid size-4 place-items-center rounded border transition-colors ${
                        isActive
                          ? "text-white/85 border-white/20 bg-white/10 hover:text-rose-100 hover:bg-rose-500/55 hover:border-rose-300/80"
                          : "text-slate-400 border-surface-700/80 bg-surface-900/60 hover:text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/10"
                      }`}
                    >
                      <Trash2 className="size-2.5" />
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
