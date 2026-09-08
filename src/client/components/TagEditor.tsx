import React, { useState } from "react";
import { X } from "lucide-react";

interface TagEditorProps {
  tags: string[];
  onChangeTags: (tags: string[]) => void;
}

export const TagEditor: React.FC<TagEditorProps> = ({ tags, onChangeTags }) => {
  const [inputValue, setInputValue] = useState("");

  const addTag = (val: string) => {
    const clean = val.trim().replace(/^#/, "");
    if (clean && !tags.includes(clean)) {
      onChangeTags([...tags, clean]);
    }
    setInputValue("");
  };

  const removeTag = (tagToRemove: string) => {
    onChangeTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes(",")) {
      val.split(",").forEach((p) => {
        if (p.trim()) addTag(p);
      });
      setInputValue("");
    } else {
      setInputValue(val);
    }
  };

  return (
    <div className="flex items-center flex-nowrap gap-1 h-8 overflow-x-auto bg-surface-850 border border-surface-750 rounded-lg px-2.5 text-xs text-slate-300 focus-within:border-brand-500">
      <span className="text-slate-500 leading-none shrink-0">#</span>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center h-5 shrink-0 rounded-full border border-brand-500/30 bg-brand-500/15 pl-1.5 pr-0.5"
        >
          <span className="text-[11px] font-medium leading-none text-brand-400 translate-y-px">
            #{tag}
          </span>
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="flex h-5 w-3.5 items-center justify-center text-brand-400 hover:text-rose-400"
            title="Удалить тег"
          >
            <X className="block size-2.5" strokeWidth={2.25} aria-hidden />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => inputValue.trim() && addTag(inputValue)}
        placeholder={tags.length === 0 ? "Теги (Enter для добавления)..." : "+ тег"}
        className="bg-transparent border-none p-0 text-xs leading-none text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-0 min-w-[72px] flex-1"
      />
    </div>
  );
};
