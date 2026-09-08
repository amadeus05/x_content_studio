import React, { useState } from "react";
import {
  MessageCircle,
  Repeat2,
  Heart,
  Bookmark,
  Share,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { PostVariantDto } from "../../modules/content/application/dtos/PostDto.ts";
import { PreviewMedia } from "./MediaGallery.tsx";

interface TwitterPreviewProps {
  variant: PostVariantDto;
  userHandle?: string;
  userName?: string;
  avatarUrl?: string;
  onMarkPosted?: (tweetUrl?: string) => void;
  status: string;
  media?: PreviewMedia[];
}

export const TwitterPreview: React.FC<TwitterPreviewProps> = ({
  variant,
  userHandle = "creator",
  userName = "Creator",
  avatarUrl,
  onMarkPosted,
  status,
  media = []
}) => {
  const [copied, setCopied] = useState(false);
  const [showPostedDialog, setShowPostedDialog] = useState(false);
  const [tweetUrlInput, setTweetUrlInput] = useState("");

  const fullText = variant.fullText || "";
  const charCount = variant.charCount;
  const remaining = variant.remainingChars;
  const isOver = variant.isOverLimit;

  // Рассчитываем процент для SVG круга прогресса (как в X)
  const percent = Math.min(100, Math.max(0, (charCount / 280) * 100));
  const circleRadius = 10;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  let progressColor = "#1d9bf0"; // blue
  if (remaining <= 20 && remaining >= 0) progressColor = "#f59e0b"; // orange
  if (isOver) progressColor = "#f43f5e"; // red

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Форматирование ссылок и тегов для превью
  const renderFormattedText = (text: string) => {
    if (!text) {
      return <span className="text-zinc-500 italic">Начните писать хук или текст, чтобы увидеть превью твита...</span>;
    }

    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith("#") && part.length > 1) {
        return <span key={index} className="text-sky-400 hover:underline cursor-pointer">{part}</span>;
      }
      if (part.startsWith("@") && part.length > 1) {
        return <span key={index} className="text-sky-400 hover:underline cursor-pointer">{part}</span>;
      }
      if (part.startsWith("http://") || part.startsWith("https://")) {
        return (
          <span key={index} className="text-sky-400 hover:underline break-all">
            {part.length > 30 ? part.slice(0, 30) + "…" : part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="bg-[#0f141c] border border-[#222b3d] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      {/* Header Превью */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c2433] mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Live X Preview</span>
          {variant.isPremium && (
            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-semibold">
              X Premium (Длинный)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Индикатор лимита знаков */}
          <div className="flex items-center gap-2 bg-[#171e2c] px-3 py-1 rounded-full border border-[#273349]">
            <svg className="w-6 h-6 -rotate-90" viewBox="0 0 28 28">
              <circle
                cx="14"
                cy="14"
                r={circleRadius}
                fill="transparent"
                stroke="#2a374d"
                strokeWidth="2.5"
              />
              <circle
                cx="14"
                cy="14"
                r={circleRadius}
                fill="transparent"
                stroke={progressColor}
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <span
              className={`text-xs font-mono font-bold ${
                isOver ? "text-rose-400" : remaining <= 20 ? "text-amber-400" : "text-zinc-300"
              }`}
            >
              {remaining}
            </span>
          </div>

          {/* Кнопка копирования */}
          <button
            onClick={handleCopy}
            title="Скопировать готовый текст для X"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Скопировано!" : "Копировать"}
          </button>

          {/* Кнопка отметить как опубликованный */}
          {status !== "POSTED" && onMarkPosted && (
            <button
              onClick={() => setShowPostedDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Запостил
            </button>
          )}
        </div>
      </div>

      {/* Твит - Точное воспроизведение X */}
      <div className="flex gap-3">
        {/* Аватар */}
        <div className="shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md border border-white/10">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        {/* Тело твита */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[15px] text-white hover:underline cursor-pointer">
              {userName}
            </span>
            <svg className="w-4 h-4 text-[#1d9bf0]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-zinc-500 text-[14px]">@{userHandle}</span>
            <span className="text-zinc-600 text-[14px]">·</span>
            <span className="text-zinc-500 text-[14px]">сейчас</span>
          </div>

          {/* Текст твита */}
          <div className="mt-2 text-[15px] leading-relaxed text-zinc-100 whitespace-pre-wrap break-words">
            {renderFormattedText(fullText)}
          </div>

          {media.length > 0 && (
            <div
              className={`mt-3 overflow-hidden rounded-2xl border border-[#2f3336] ${
                media.length === 1 ? "" : "grid grid-cols-2 gap-0.5"
              } ${media.length === 3 ? "grid-rows-2" : ""}`}
            >
              {media.slice(0, 4).map((item, index) => {
                const tallThird = media.length === 3 && index === 0;
                return (
                  <div
                    key={item.id}
                    className={`bg-[#16181c] overflow-hidden ${
                      media.length === 1 ? "max-h-[420px]" : "min-h-[140px] max-h-[220px]"
                    } ${tallThird ? "row-span-2 max-h-none" : ""}`}
                  >
                    {item.kind === "video" ? (
                      <video
                        src={item.url}
                        controls
                        className="w-full h-full object-cover max-h-[420px]"
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt={item.altText || ""}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Интерактивный футер твита */}
          <div className="flex items-center justify-between text-zinc-500 max-w-md mt-4 pt-3 border-t border-[#18202e] text-xs">
            <div className="flex items-center gap-2 hover:text-sky-400 transition cursor-pointer">
              <MessageCircle className="w-4 h-4" />
              <span>12</span>
            </div>
            <div className="flex items-center gap-2 hover:text-emerald-400 transition cursor-pointer">
              <Repeat2 className="w-4 h-4" />
              <span>8</span>
            </div>
            <div className="flex items-center gap-2 hover:text-rose-400 transition cursor-pointer">
              <Heart className="w-4 h-4" />
              <span>142</span>
            </div>
            <div className="flex items-center gap-2 hover:text-sky-400 transition cursor-pointer">
              <Bookmark className="w-4 h-4" />
              <span>38</span>
            </div>
            <div className="flex items-center gap-2 hover:text-sky-400 transition cursor-pointer">
              <Share className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения публикации */}
      {showPostedDialog && (
        <div className="absolute inset-0 bg-[#090d14]/90 backdrop-blur-sm flex items-center justify-center p-4 z-20">
          <div className="bg-[#131924] border border-[#273449] rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Отметить как опубликованный
            </h4>
            <p className="text-xs text-zinc-400 mb-3">
              Вставьте ссылку на твит в X, чтобы сохранить его в историю и отслеживать метрики:
            </p>
            <input
              type="url"
              placeholder="https://x.com/username/status/..."
              value={tweetUrlInput}
              onChange={(e) => setTweetUrlInput(e.target.value)}
              className="w-full bg-[#0b0e14] border border-[#242e40] rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPostedDialog(false)}
                className="px-3 py-1.5 bg-[#1b2230] hover:bg-[#252f42] text-xs font-medium text-zinc-300 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onMarkPosted?.(tweetUrlInput);
                  setShowPostedDialog(false);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-lg"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
