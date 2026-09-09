import React from "react";
import { Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { PostDto } from "../../modules/content/application/dtos/PostDto.ts";

interface PostCardProps {
  post: PostDto;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function formatListDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startToday - startDate) / 86400000);
  if (diffDays === 1) return "Вчера";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatReach(value?: number): string | null {
  if (!value) return null;
  if (value >= 1000) {
    const compact = (value / 1000).toFixed(1).replace(/\.0$/, "");
    return `${compact}k охват`;
  }
  return `${value} охват`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "POSTED") {
    return (
      <span className="inline-flex items-center space-x-1 font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md">
        <Check className="w-2.5 h-2.5" strokeWidth={2.75} />
        <span>Запощен</span>
      </span>
    );
  }

  if (status === "DRAFT") {
    return (
      <span className="inline-flex items-center space-x-1 font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
        <span>Черновик</span>
      </span>
    );
  }

  const styles: Record<string, string> = {
    IDEA: "text-sky-400 bg-sky-400/10",
    AI_REVIEW: "text-ai-400 bg-ai-500/10",
    READY: "text-brand-400 bg-brand-500/10",
    ARCHIVED: "text-slate-400 bg-surface-800"
  };

  const labels: Record<string, string> = {
    IDEA: "Идея",
    AI_REVIEW: "На ревью",
    READY: "Готов",
    ARCHIVED: "Архив"
  };

  return (
    <span className={`inline-flex items-center font-medium px-2 py-0.5 rounded-md ${styles[status] || "text-slate-400 bg-surface-800"}`}>
      {labels[status] || status}
    </span>
  );
}

export const PostCard: React.FC<PostCardProps> = ({ post, onSelect, onDelete }) => {
  const activeVariant = post.activeVariant;
  const hook = activeVariant.hook || activeVariant.body.split("\n")[0] || "Без названия...";
  const bodySnippet = (activeVariant.hook ? activeVariant.body : activeVariant.body.split("\n").slice(1).join(" ")).trim();
  const isPosted = post.status === "POSTED";
  const reach = formatReach(post.metrics.impressions);
  const dateLabel = formatListDate(post.updatedAt);

  return (
    <div
      onClick={onSelect}
      className="h-full min-h-0 p-2.5 rounded-xl cursor-pointer select-none relative group transition-all bg-surface-900/90 border border-surface-800/90 hover:border-surface-700 hover:bg-surface-850/50 flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between text-[11px] mb-1.5 shrink-0">
        <StatusBadge status={post.status} />
        <div className="flex items-center space-x-1.5 text-slate-500">
          <span>{dateLabel}</span>
          <button
            type="button"
            onClick={onDelete}
            className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition p-0.5"
            title="Удалить пост"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <h4
        className={`text-xs leading-snug line-clamp-2 font-semibold shrink-0 ${
          isPosted ? "text-slate-400" : "text-slate-300"
        }`}
      >
        {hook}
      </h4>

      <div className="flex-1 min-h-0 overflow-hidden mt-1 mb-2">
        {!isPosted && bodySnippet ? (
          <p className="text-[11px] leading-snug line-clamp-2 text-slate-500">{bodySnippet}</p>
        ) : null}
      </div>

      <div className="shrink-0">
        {isPosted ? (
          <div className="flex items-center justify-between pt-1.5 border-t border-surface-800/60 text-[10px] text-slate-500">
            <span className="text-brand-400">{reach || "Нет охвата"}</span>
            <span>{post.metrics.retweets ? `${post.metrics.retweets} репостов` : "Без репостов"}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2 border-t border-surface-800/60 text-[10px] text-slate-500">
            <div className="flex items-center space-x-1 min-w-0">
              {post.tags[0] && (
                <span className="bg-surface-800/80 px-1.5 py-0.5 rounded text-slate-400">#{post.tags[0]}</span>
              )}
              {post.tags.length > 1 && (
                <span className="text-slate-400 bg-surface-800 px-1.5 py-0.5 rounded">+{post.tags.length - 1}</span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-slate-400 shrink-0">
              {post.variants.length > 1 && (
                <span className="text-ai-400 font-medium flex items-center space-x-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{post.variants.length} вар.</span>
                </span>
              )}
              <span
                className={
                  activeVariant.isOverLimit
                    ? "text-rose-400"
                    : activeVariant.remainingChars <= 20
                      ? "text-amber-400"
                      : ""
                }
              >
                {activeVariant.charCount}/280
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const NewPostCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="h-full min-h-0 w-full rounded-xl border border-dashed border-surface-700 hover:border-brand-500/50 hover:bg-brand-500/5 text-slate-500 hover:text-brand-400 transition-all flex flex-col items-center justify-center gap-1.5"
  >
    <div className="w-8 h-8 rounded-full border border-dashed border-current flex items-center justify-center">
      <Plus className="w-4 h-4" strokeWidth={2} />
    </div>
    <span className="text-xs font-medium">Новый черновик</span>
  </button>
);
