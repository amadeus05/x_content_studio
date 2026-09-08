import React, { useState } from "react";
import { Plus, Trash2, Edit2, Check, Sparkles } from "lucide-react";
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
    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#1c2433] mb-4">
      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        Хуки / Варианты:
      </span>

      {variants.map((v) => {
        const isActive = v.id === activeVariantId;

        if (editingId === v.id) {
          return (
            <div key={v.id} className="flex items-center gap-1 bg-[#192233] border border-sky-500/50 rounded-lg px-2 py-1">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveEdit(v.id)}
                autoFocus
                className="bg-transparent text-xs text-white outline-none w-28"
              />
              <button onClick={() => saveEdit(v.id)} className="text-emerald-400 hover:text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        return (
          <div
            key={v.id}
            onClick={() => onSelectVariant(v.id)}
            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition select-none ${
              isActive
                ? "bg-[#1d273a] text-sky-400 border border-sky-500/40 shadow-sm"
                : "bg-[#111722] text-zinc-400 border border-[#1e2738] hover:bg-[#161e2c] hover:text-zinc-200"
            }`}
          >
            <span>{v.variantLabel}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded ${
                v.isOverLimit ? "bg-rose-500/20 text-rose-300" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {v.charCount} зн.
            </span>

            {/* Быстрые действия: переименовать и удалить */}
            <div className="hidden group-hover:flex items-center gap-1 ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(v);
                }}
                className="text-zinc-400 hover:text-zinc-200"
                title="Переименовать вариант"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              {variants.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteVariant(v.id);
                  }}
                  className="text-zinc-400 hover:text-rose-400"
                  title="Удалить вариант"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Кнопка добавления нового варианта */}
      <button
        onClick={() => onAddVariant(`Вариант ${variants.length + 1}`)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-[#121824] hover:bg-[#1b2333] text-zinc-400 hover:text-white text-xs font-medium rounded-lg border border-dashed border-[#26334a] transition shrink-0"
        title="Создать альтернативный хук к этому посту"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Вариант</span>
      </button>
    </div>
  );
};
