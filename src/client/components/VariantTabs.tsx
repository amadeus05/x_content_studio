import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Edit2, Check, Zap } from "lucide-react";
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
                <div key={v.id} className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-850 shrink-0">
                  <input
                    type="text"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(v.id)}
                    autoFocus
                    className="bg-transparent text-xs text-white outline-none w-24 select-text"
                  />
                  <button type="button" onClick={() => saveEdit(v.id)} className="text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
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
                className={`group flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs shrink-0 cursor-pointer ${
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
                    className={isActive ? "text-white/80 hover:text-amber-300" : "text-slate-500 hover:text-amber-300"}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      title="Удалить"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteVariant(v.id);
                      }}
                      className={isActive ? "text-white hover:text-rose-400" : "text-slate-400 hover:text-rose-400"}
                    >
                      <Trash2 className="w-3 h-3" />
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
