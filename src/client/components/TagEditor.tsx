import React, { useState } from "react";
import { Hash, X } from "lucide-react";

interface TagEditorProps {
  tags: string[];
  onChangeTags: (tags: string[]) => void;
}

export const TagEditor: React.FC<TagEditorProps> = ({ tags, onChangeTags }) => {
  const [inputValue, setInputValue] = useState("");

  const addTag = (val: string) => {
    const clean = val.trim().replace(/^#/, "");
    if (clean && !tags.includes(clean)) {
      const newTags = [...tags, clean];
      onChangeTags(newTags);
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
      const parts = val.split(",");
      parts.forEach((p) => {
        if (p.trim()) addTag(p);
      });
      setInputValue("");
    } else {
      setInputValue(val);
    }
  };

  return (
    <div className="flex items-center flex-wrap gap-1.5 bg-[#121824] border border-[#232f44] rounded-lg px-2.5 py-1 min-h-[32px] max-w-md focus-within:border-sky-500 transition">
      <Hash className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full"
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-rose-400 p-0.5 transition"
            title="Удалить тег"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => inputValue.trim() && addTag(inputValue)}
        placeholder={tags.length === 0 ? "Теги (Enter или запятая)..." : "+ тег..."}
        className="bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none min-w-[90px] flex-1 py-0.5"
      />
    </div>
  );
};
