import React, { useState } from "react";
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

  return (
    <div className="flex items-center justify-between bg-surface-900/70 p-2 rounded-xl border border-surface-800 gap-3">
      <div className="flex items-center space-x-2 min-w-0">
        <span className="text-xs font-bold uppercase tracking-wider text-ai-400 flex items-center space-x-1.5 px-2 shrink-0">
          <Zap className="w-3.5 h-3.5" />
          <span>Хуки / Варианты:</span>
        </span>
        <div className="flex items-center space-x-1 bg-surface-950 p-1 rounded-lg border border-surface-800 overflow-x-auto">
          {variants.map((v) => {
            const isActive = v.id === activeVariantId;

            if (editingId === v.id) {
              return (
                <div key={v.id} className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-850">
                  <input
                    type="text"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(v.id)}
                    autoFocus
                    className="bg-transparent text-xs text-white outline-none w-24"
                  />
                  <button type="button" onClick={() => saveEdit(v.id)} className="text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVariant(v.id)}
                className={`group relative flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs transition-colors shrink-0 ${
                  isActive
                    ? "font-semibold bg-brand-500 text-white shadow-sm"
                    : "font-medium text-slate-400 hover:text-slate-200 hover:bg-surface-850"
                }`}
              >
                <span>{v.variantLabel}</span>
                <span className={`text-[10px] ${isActive ? "opacity-80 font-normal" : "opacity-70"}`}>
                  {v.charCount} зн.
                </span>
                <span className="hidden group-hover:inline-flex items-center gap-0.5 ml-0.5">
                  <span
                    role="button"
                    title="Переименовать"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(v);
                    }}
                    className={isActive ? "text-white/80 hover:text-amber-300" : "text-slate-500 hover:text-amber-300"}
                  >
                    <Edit2 className="w-3 h-3" />
                  </span>
                  {variants.length > 1 && (
                    <span
                      role="button"
                      title="Удалить"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteVariant(v.id);
                      }}
                      className={isActive ? "text-white hover:text-rose-400" : "text-slate-400 hover:text-rose-400"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  )}
                </span>
              </button>
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
