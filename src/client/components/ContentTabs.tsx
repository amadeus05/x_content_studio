import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Edit2, Check, Zap, FileText, X, Pin } from "lucide-react";

export interface ContentTabItem {
  id: string;
  label: string;
  charCount?: number;
  isPinned?: boolean;
}

interface ContentTabsProps {
  items: ContentTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  title: string;
  iconType: "hook" | "body";
  addButtonText: string;
  theme?: "purple" | "emerald" | "brand";
}

export const ContentTabs: React.FC<ContentTabsProps> = ({
  items,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  onUpdateLabel,
  title,
  iconType,
  addButtonText,
  theme = "brand"
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

  // Если активный таб обрезан краем — плавно доскроллить с учётом padding и border
  useEffect(() => {
    if (dragging) return;
    const root = scrollerRef.current;
    if (!root) return;
    const tab = root.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeId)}"]`);
    if (!tab) return;

    const frame = requestAnimationFrame(() => {
      const styles = getComputedStyle(root);
      const padLeft = parseFloat(styles.paddingLeft) || 0;
      const padRight = parseFloat(styles.paddingRight) || 0;
      const borderLeft = parseFloat(styles.borderLeftWidth) || 0;
      const borderRight = parseFloat(styles.borderRightWidth) || 0;

      const rootRect = root.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      const visibleLeft = rootRect.left + borderLeft + padLeft;
      const visibleRight = rootRect.right - borderRight - padRight;

      let delta = 0;
      if (tabRect.left < visibleLeft - 0.5) {
        delta = tabRect.left - visibleLeft;
      } else if (tabRect.right > visibleRight + 0.5) {
        delta = tabRect.right - visibleRight;
      }

      if (Math.abs(delta) < 0.5) return;

      const targetLeft = Math.round(root.scrollLeft + delta);
      root.scrollTo({ left: targetLeft, behavior: "smooth" });

      let snapped = false;
      const snap = () => {
        if (snapped) return;
        snapped = true;
        root.scrollLeft = targetLeft;
        root.removeEventListener("scrollend", snap);
      };
      root.addEventListener("scrollend", snap);
      window.setTimeout(snap, 350);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeId, items.length, dragging]);

  const startEdit = (item: ContentTabItem) => {
    setEditingId(item.id);
    setLabelInput(item.label);
  };

  const saveEdit = (id: string) => {
    if (labelInput.trim()) {
      onUpdateLabel(id, labelInput.trim());
    }
    setEditingId(null);
  };

  const handleSelect = (id: string) => {
    if (dragRef.current.skipClick) {
      dragRef.current.skipClick = false;
      return;
    }
    onSelect(id);
  };

  const isPurple = theme === "purple";
  const isEmerald = theme === "emerald";
  const withPinSlot = items.some((i) => i.isPinned !== undefined);

  const themeColors = isPurple
    ? {
        label: "text-purple-400",
        activeTab: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25",
        addBtn: "text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/30",
        pinIcon: "text-purple-300"
      }
    : isEmerald
    ? {
        label: "text-emerald-400",
        activeTab: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25",
        addBtn: "text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30",
        pinIcon: "text-emerald-300"
      }
    : {
        label: "text-brand-400",
        activeTab: "bg-brand-500 text-white shadow-sm",
        addBtn: "text-brand-400 hover:bg-brand-500/10 hover:border-brand-500/30",
        pinIcon: "text-brand-300"
      };

  return (
    <div className="flex items-center justify-between bg-surface-900/80 p-2 rounded-xl border border-surface-800 gap-3">
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <span
          className={`text-xs font-bold uppercase tracking-wider ${themeColors.label} flex items-center space-x-1.5 px-2 shrink-0`}
        >
          {iconType === "hook" ? (
            <Zap className="w-3.5 h-3.5" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          <span>{title}:</span>
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
          {items.map((item) => {
            const isActive = item.id === activeId;

            if (editingId === item.id) {
              return (
                <div
                  key={item.id}
                  data-tab-id={item.id}
                  className="flex items-center gap-1 px-3 py-1 rounded-md bg-surface-850 border border-surface-750 shrink-0"
                >
                  <input
                    type="text"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(item.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onFocus={(e) => e.currentTarget.select()}
                    autoFocus
                    className="bg-transparent text-xs text-white outline-none w-28 select-text leading-none"
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
                    onClick={() => saveEdit(item.id)}
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
                key={item.id}
                data-tab-id={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(item.id);
                  }
                }}
                className={`group flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold shrink-0 cursor-pointer outline-none transition-colors ${
                  isActive
                    ? themeColors.activeTab
                    : "text-slate-400 hover:text-slate-200 hover:bg-surface-850"
                }`}
              >
                {withPinSlot && (
                  <span
                    title={item.isPinned ? "Закреплено" : undefined}
                    className={`shrink-0 flex items-center ${item.isPinned ? "" : "invisible"}`}
                    aria-hidden={!item.isPinned}
                  >
                    <Pin
                      className={`w-2.5 h-2.5 rotate-45 ${
                        isActive ? "text-amber-300 fill-amber-300" : "text-amber-400/70"
                      }`}
                    />
                  </span>
                )}
                <span className="truncate max-w-[140px]">{item.label}</span>
                {item.charCount !== undefined && (
                  <span
                    className={`text-[10px] font-normal tabular-nums ${
                      isActive ? "opacity-85" : "opacity-60"
                    }`}
                  >
                    {item.charCount} зн.
                  </span>
                )}
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
                      startEdit(item);
                    }}
                    className={`grid size-4 place-items-center rounded border transition-colors ${
                      isActive
                        ? "text-white/85 border-white/20 bg-white/10 hover:text-amber-300 hover:bg-amber-500/35 hover:border-amber-300/70"
                        : "text-slate-400 border-surface-700/80 bg-surface-900/60 hover:text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/10"
                    }`}
                  >
                    <Edit2 className="size-2.5" />
                  </button>
                  {items.length > 1 ? (
                    <button
                      type="button"
                      title="Удалить"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className={`grid size-4 place-items-center rounded border transition-colors ${
                        isActive
                          ? "text-white/85 border-white/20 bg-white/10 hover:text-rose-100 hover:bg-rose-500/55 hover:border-rose-300/80"
                          : "text-slate-400 border-surface-700/80 bg-surface-900/60 hover:text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/10"
                      }`}
                    >
                      <Trash2 className="size-2.5" />
                    </button>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-transparent transition-colors shrink-0 ${themeColors.addBtn}`}
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{addButtonText}</span>
      </button>
    </div>
  );
};
