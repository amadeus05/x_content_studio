import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Info, Plus, Star, Trash2, Video } from "lucide-react";
import { ApiClient } from "../services/ApiClient.ts";
import { MediaDto } from "../../modules/media/application/dtos/MediaDto.ts";

export type MediaOwnerType = "post" | "post_variant";

export interface PreviewMedia {
  id: string;
  kind: "image" | "video";
  url: string;
  altText: string;
}

interface MediaGalleryProps {
  postId: string;
  variantId: string;
  onPreviewChange: (items: PreviewMedia[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  postId,
  variantId,
  onPreviewChange
}) => {
  const [ownerType, setOwnerType] = useState<MediaOwnerType>("post");
  const [postItems, setPostItems] = useState<MediaDto[]>([]);
  const [variantItems, setVariantItems] = useState<MediaDto[]>([]);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<Record<string, string>>({});
  const onPreviewChangeRef = useRef(onPreviewChange);

  onPreviewChangeRef.current = onPreviewChange;

  const items = ownerType === "post" ? postItems : variantItems;
  const ownerId = ownerType === "post" ? postId : variantId;

  const revokeAll = (urls: Record<string, string>) => {
    Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
  };

  const hydrateBlobs = async (list: MediaDto[], keep: Record<string, string>) => {
    const next: Record<string, string> = { ...keep };
    await Promise.all(
      list.map(async (item) => {
        if (next[item.id]) return;
        try {
          next[item.id] = await ApiClient.getMediaBlobUrl(item.id);
        } catch {
          // Same-origin URL: браузер сам приложит session cookie
          next[item.id] = item.url;
        }
      })
    );
    return next;
  };

  const load = useCallback(async () => {
    if (!postId || !variantId) return;
    try {
      const [postList, variantList] = await Promise.all([
        ApiClient.listMedia("post", postId),
        ApiClient.listMedia("post_variant", variantId)
      ]);
      setPostItems(postList);
      setVariantItems(variantList);
      setError("");
      const next = await hydrateBlobs([...postList, ...variantList], {});
      revokeAll(blobUrlsRef.current);
      blobUrlsRef.current = next;
      setBlobUrls(next);
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить медиа");
    }
  }, [postId, variantId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => revokeAll(blobUrlsRef.current);
  }, []);

  useEffect(() => {
    const source = variantItems.length > 0 ? variantItems : postItems;
    const cover = source.find((item) => item.isPrimary);
    onPreviewChangeRef.current(
      cover
        ? [
            {
              id: cover.id,
              kind: cover.kind,
              url: blobUrls[cover.id] || cover.url,
              altText: cover.altText
            }
          ]
        : []
    );
  }, [postItems, variantItems, blobUrls]);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of list) {
        await ApiClient.uploadMedia(ownerType, ownerId, file);
      }
      await load();
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 shadow-sm focus-within:border-brand-500/80 transition-all">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
          3. Медиафайлы (картинки и видео):
        </label>
        <div className="flex items-center space-x-1 bg-surface-950 p-1 rounded-lg border border-surface-800">
          <button
            type="button"
            onClick={() => setOwnerType("post")}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              ownerType === "post"
                ? "font-semibold bg-brand-500 text-white shadow-sm"
                : "font-medium text-slate-400 hover:text-slate-200 hover:bg-surface-850"
            }`}
          >
            Пост{postItems.length > 0 ? ` · ${postItems.length}` : ""}
          </button>
          <button
            type="button"
            onClick={() => setOwnerType("post_variant")}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${
              ownerType === "post_variant"
                ? "font-semibold bg-brand-500 text-white shadow-sm"
                : "font-medium text-slate-400 hover:text-slate-200 hover:bg-surface-850"
            }`}
          >
            Вариант{variantItems.length > 0 ? ` · ${variantItems.length}` : ""}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {items.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center bg-surface-950/60 transition-colors ${
            isDragOver
              ? "border-brand-500 bg-brand-500/5"
              : "border-surface-750 hover:border-brand-500/50"
          }`}
        >
          <svg
            className="w-6 h-6 text-slate-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <div className="text-xs font-medium text-slate-200">
            {uploading ? "Загрузка…" : "Перетащите картинку или видео сюда"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            JPG, PNG, GIF, WebP · MP4, WebM · до 4 файлов
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-3 flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-surface-850 hover:bg-surface-800 border border-surface-750 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Загрузить с компьютера</span>
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
          }}
          className={`rounded-lg border border-dashed p-2 bg-surface-950/60 transition-colors ${
            isDragOver ? "border-brand-500" : "border-surface-800"
          }`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {items.map((item) => {
              const src = blobUrls[item.id];
              return (
                <div
                  key={item.id}
                  className={`relative group rounded-lg overflow-hidden border bg-surface-950 aspect-square ${
                    item.isPrimary ? "border-brand-500/70" : "border-surface-800"
                  }`}
                >
                  {src && item.kind === "image" ? (
                    <img src={src} alt={item.altText || item.filename} className="w-full h-full object-cover" />
                  ) : src && item.kind === "video" ? (
                    <video src={src} className="w-full h-full object-cover" muted />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      {item.kind === "video" ? <Video className="w-6 h-6" /> : <ImagePlus className="w-6 h-6" />}
                    </div>
                  )}
                  {item.kind === "video" && (
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">
                      VIDEO
                    </span>
                  )}
                  {item.isPrimary && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-semibold bg-brand-500 text-white px-1.5 py-0.5 rounded">
                      Обложка
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition flex items-center justify-between gap-1">
                    <span className="text-[9px] text-slate-300 truncate">{formatSize(item.sizeBytes)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Сделать обложкой"
                        onClick={() =>
                          ApiClient.setPrimaryMedia(item.id).then(load).catch((err) => setError(err.message))
                        }
                        className={`p-1 rounded ${item.isPrimary ? "text-amber-300" : "text-slate-300 hover:text-amber-300"}`}
                      >
                        <Star className="w-3 h-3" fill={item.isPrimary ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        title="Удалить"
                        onClick={() =>
                          ApiClient.deleteMedia(item.id).then(load).catch((err) => setError(err.message))
                        }
                        className="p-1 rounded text-slate-300 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-lg border border-dashed border-surface-750 hover:border-brand-500/50 bg-surface-900/40 text-slate-400 hover:text-slate-200 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-medium">{uploading ? "Загрузка…" : "Ещё файл"}</span>
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-[11px] text-rose-400 mt-2">{error}</div>}

      <p className="text-[11px] text-slate-500 mt-1.5 flex items-start gap-1.5 leading-snug">
        <Info className="block w-3.5 h-3.5 text-amber-400 shrink-0 mt-px" aria-hidden />
        <span>
          {ownerType === "post"
            ? "Общие файлы поста — в превью всех вариантов, если у варианта нет своих."
            : "Только для текущего варианта. Если пусто — в превью идут медиа поста."}
        </span>
      </p>
    </div>
  );
};
