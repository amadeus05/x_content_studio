import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Star, Trash2, Upload, Video } from "lucide-react";
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
          const pin = localStorage.getItem("xm_auth_pin") || "1234";
          next[item.id] = `${item.url}?pin=${encodeURIComponent(pin)}`;
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

      const combined = [...postList, ...variantList];
      const next = await hydrateBlobs(combined, {});
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
    onPreviewChangeRef.current(
      source.map((item) => ({
        id: item.id,
        kind: item.kind,
        url: blobUrls[item.id] || item.url,
        altText: item.altText
      }))
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await ApiClient.deleteMedia(id);
      await load();
    } catch (err: any) {
      setError(err.message || "Не удалось удалить");
    }
  };

  const handlePrimary = async (id: string) => {
    try {
      await ApiClient.setPrimaryMedia(id);
      await load();
    } catch (err: any) {
      setError(err.message || "Не удалось назначить обложку");
    }
  };

  return (
    <div className="bg-[#0f141c] border border-[#1e2738] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <ImagePlus className="w-3.5 h-3.5 text-sky-400" />
          Медиа (картинки и видео)
        </label>
        <div className="flex items-center bg-[#121824] border border-[#232f44] rounded-lg p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setOwnerType("post")}
            className={`px-2.5 py-1 rounded-md transition ${
              ownerType === "post" ? "bg-sky-500/20 text-sky-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Для поста{postItems.length > 0 ? ` (${postItems.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setOwnerType("post_variant")}
            className={`px-2.5 py-1 rounded-md transition ${
              ownerType === "post_variant" ? "bg-sky-500/20 text-sky-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Для варианта{variantItems.length > 0 ? ` (${variantItems.length})` : ""}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500">
        {ownerType === "post"
          ? "Общие файлы поста — видны во всех вариантах, если у варианта нет своих."
          : "Только для текущего варианта хука. Если пусто — в превью берутся медиа поста."}
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border border-dashed border-[#2a374d] hover:border-sky-500/50 rounded-xl px-4 py-5 text-center cursor-pointer bg-[#0b0e14] transition"
      >
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
        <Upload className="w-5 h-5 text-zinc-500 mx-auto mb-1.5" />
        <div className="text-xs text-zinc-300 font-medium">
          {uploading ? "Загрузка…" : "Перетащите файлы или нажмите, чтобы выбрать"}
        </div>
        <div className="text-[10px] text-zinc-500 mt-1">JPG, PNG, GIF, WebP · MP4, WebM · до 8 МБ / 32 МБ</div>
      </div>

      {error && <div className="text-[11px] text-rose-400">{error}</div>}

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {items.map((item) => {
            const src = blobUrls[item.id];
            return (
              <div
                key={item.id}
                className={`relative group rounded-lg overflow-hidden border bg-[#121824] aspect-square ${
                  item.isPrimary ? "border-sky-500/70" : "border-[#243046]"
                }`}
              >
                {src && item.kind === "image" ? (
                  <img src={src} alt={item.altText || item.filename} className="w-full h-full object-cover" />
                ) : src && item.kind === "video" ? (
                  <video src={src} className="w-full h-full object-cover" muted />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    {item.kind === "video" ? <Video className="w-6 h-6" /> : <ImagePlus className="w-6 h-6" />}
                  </div>
                )}

                {item.kind === "video" && (
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">
                    VIDEO
                  </span>
                )}
                {item.isPrimary && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-sky-500 text-white px-1.5 py-0.5 rounded">
                    Обложка
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition flex items-center justify-between gap-1">
                  <span className="text-[9px] text-zinc-300 truncate">{formatSize(item.sizeBytes)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Сделать обложкой"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrimary(item.id);
                      }}
                      className={`p-1 rounded ${item.isPrimary ? "text-amber-300" : "text-zinc-300 hover:text-amber-300"}`}
                    >
                      <Star className="w-3 h-3" fill={item.isPrimary ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      title="Удалить"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="p-1 rounded text-zinc-300 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
