import React, { useState } from "react";
import {
  MessageCircle,
  Repeat2,
  Heart,
  Bookmark,
  Share,
  Copy,
  Check,
  CheckCircle2
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
  const hook = variant.hook || "";
  const body = variant.body || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlight = (text: string) => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if ((part.startsWith("#") || part.startsWith("@")) && part.length > 1) {
        return (
          <span key={index} className="text-brand-400 hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      if (part.startsWith("http://") || part.startsWith("https://")) {
        return (
          <span key={index} className="text-brand-400 hover:underline break-all">
            {part.length > 30 ? part.slice(0, 30) + "…" : part}
          </span>
        );
      }
      return part;
    });
  };

  const initials = userName
    .replace(/\|/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || userName.charAt(0).toUpperCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Live X Preview</span>
          {variant.isPremium && (
            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-semibold">
              X Premium
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-surface-850 hover:bg-surface-800 border border-surface-750 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Скопировано" : "Копировать"}</span>
          </button>
          {status !== "POSTED" && onMarkPosted && (
            <button
              type="button"
              onClick={() => setShowPostedDialog(true)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/30 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Запостить в X</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-black border border-surface-800 rounded-2xl p-4 md:p-5 text-white shadow-xl relative overflow-hidden">
        <div className="flex space-x-3">
          <div className="shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-500 flex items-center justify-center font-bold text-sm text-white ring-2 ring-surface-800 overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 leading-snug truncate">
                <span className="font-bold text-slate-100 text-sm hover:underline cursor-pointer">{userName}</span>
                <svg className="w-4 h-4 text-brand-500 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 10.45.7 11.82.7 13.4c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.05 1.273 2.42 2.148 4 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-1.05 2.148-2.42 2.148-4zM10.2 16.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.7-5.7 1.4 1.4-7.1 7.1z" />
                </svg>
                <span className="text-slate-500 text-xs truncate">@{userHandle}</span>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-slate-500 text-xs whitespace-nowrap">сейчас</span>
              </div>
            </div>

            <div className="mt-2 text-[14px] leading-relaxed text-slate-100 font-normal space-y-2 select-text">
              {fullText ? (
                <>
                  {hook && <p className="font-medium text-white whitespace-pre-wrap">{highlight(hook)}</p>}
                  {body && <p className="text-slate-200 whitespace-pre-wrap">{highlight(body)}</p>}
                </>
              ) : (
                <span className="text-slate-500 italic">Начните писать хук или текст, чтобы увидеть превью…</span>
              )}
            </div>

            {media.length > 0 && (
              <div
                className={`mt-3 overflow-hidden rounded-2xl border border-[#2f3336] ${
                  media.length === 1
                    ? "w-fit max-w-full bg-black"
                    : "grid grid-cols-2 gap-0.5 bg-[#16181c]"
                } ${media.length === 3 ? "grid-rows-2" : ""}`}
              >
                {media.slice(0, 4).map((item, index) => {
                  const isSingle = media.length === 1;
                  return (
                    <div
                      key={item.id}
                      className={
                        isSingle
                          ? "max-h-[510px]"
                          : `overflow-hidden min-h-[140px] max-h-[220px] ${
                              media.length === 3 && index === 0 ? "row-span-2 max-h-none" : ""
                            }`
                      }
                    >
                      {item.kind === "video" ? (
                        <video
                          src={item.url}
                          controls
                          className={
                            isSingle
                              ? "block max-w-full max-h-[510px] w-auto h-auto"
                              : "w-full h-full object-cover"
                          }
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.altText || ""}
                          className={
                            isSingle
                              ? "block max-w-full max-h-[510px] w-auto h-auto"
                              : "w-full h-full object-cover"
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-surface-800/80 flex items-center justify-between text-slate-500 max-w-md text-xs">
              <div className="flex items-center space-x-1.5 hover:text-brand-400 cursor-pointer transition-colors group">
                <div className="p-1.5 rounded-full group-hover:bg-brand-500/10">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span>12</span>
              </div>
              <div className="flex items-center space-x-1.5 hover:text-emerald-400 cursor-pointer transition-colors group">
                <div className="p-1.5 rounded-full group-hover:bg-emerald-500/10">
                  <Repeat2 className="w-4 h-4" />
                </div>
                <span>8</span>
              </div>
              <div className="flex items-center space-x-1.5 hover:text-rose-500 cursor-pointer transition-colors group">
                <div className="p-1.5 rounded-full group-hover:bg-rose-500/10">
                  <Heart className="w-4 h-4" />
                </div>
                <span>142</span>
              </div>
              <div className="flex items-center space-x-1.5 hover:text-brand-400 cursor-pointer transition-colors group">
                <div className="p-1.5 rounded-full group-hover:bg-brand-500/10">
                  <Bookmark className="w-4 h-4" />
                </div>
                <span>38</span>
              </div>
              <div className="flex items-center hover:text-brand-400 cursor-pointer transition-colors group">
                <div className="p-1.5 rounded-full group-hover:bg-brand-500/10">
                  <Share className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {showPostedDialog && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="bg-surface-900 border border-surface-750 rounded-xl p-5 max-w-sm w-full shadow-2xl">
              <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Отметить как опубликованный
              </h4>
              <p className="text-xs text-slate-400 mb-3">Вставьте ссылку на твит в X:</p>
              <input
                type="url"
                placeholder="https://x.com/username/status/..."
                value={tweetUrlInput}
                onChange={(e) => setTweetUrlInput(e.target.value)}
                className="w-full bg-surface-950 border border-surface-750 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 mb-4"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPostedDialog(false)}
                  className="px-3 py-1.5 bg-surface-850 hover:bg-surface-800 text-xs font-medium text-slate-300 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  type="button"
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
    </div>
  );
};
