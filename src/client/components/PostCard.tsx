import React from "react";
import { Trash2, Copy, Sparkles, Clock, MessageSquare } from "lucide-react";
import { PostDto } from "../../modules/content/application/dtos/PostDto.ts";

interface PostCardProps {
  post: PostDto;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  isSelected,
  onSelect,
  onDelete
}) => {
  const activeVariant = post.activeVariant;
  const hook = activeVariant.hook || activeVariant.body.split("\n")[0] || "Без названия...";
  const bodySnippet = activeVariant.body.split("\n").slice(1).join(" ").slice(0, 80);

  const formattedDate = new Date(post.updatedAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short"
  });

  return (
    <div
      onClick={onSelect}
      className={`p-3.5 rounded-xl border transition cursor-pointer select-none relative group ${
        isSelected
          ? "bg-[#182133] border-sky-500/60 shadow-md shadow-sky-500/5"
          : "bg-[#10141d] border-[#1d2638] hover:bg-[#141a26] hover:border-[#28354e]"
      }`}
    >
      {/* Top row: Status & Date */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${post.statusBadgeColor}`}
        >
          {post.statusLabel}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3" />
            {formattedDate}
          </span>
          <button
            onClick={onDelete}
            className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition p-0.5"
            title="Удалить пост"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hook preview */}
      <h3 className="text-xs font-bold text-zinc-100 line-clamp-2 leading-snug mb-1">
        {hook}
      </h3>

      {/* Snippet */}
      {bodySnippet && (
        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-normal mb-2.5">
          {bodySnippet}
        </p>
      )}

      {/* Bottom row: tags and indicators */}
      <div className="flex items-center justify-between pt-2 border-t border-[#171f2e] text-[10px]">
        {/* Tags */}
        <div className="flex items-center gap-1 overflow-hidden">
          {post.tags.slice(0, 2).map((t, idx) => (
            <span key={idx} className="tag-pill shrink-0">
              #{t}
            </span>
          ))}
          {post.tags.length > 2 && (
            <span className="text-zinc-500">+{post.tags.length - 2}</span>
          )}
        </div>

        {/* Variants counter badge */}
        <div className="flex items-center gap-2 text-zinc-400 shrink-0">
          {post.variants.length > 1 && (
            <span className="flex items-center gap-0.5 text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-medium">
              <Sparkles className="w-2.5 h-2.5" />
              {post.variants.length} вар.
            </span>
          )}
          <span
            className={`font-mono font-medium ${
              activeVariant.isOverLimit
                ? "text-rose-400"
                : activeVariant.remainingChars <= 20
                ? "text-amber-400"
                : "text-zinc-400"
            }`}
          >
            {activeVariant.charCount}/280
          </span>
        </div>
      </div>
    </div>
  );
};
