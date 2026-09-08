import { Entity } from "../../../../shared/domain/Entity.ts";
import { Result } from "../../../../shared/domain/Result.ts";

export const MEDIA_MODEL_TYPES = ["post", "post_variant"] as const;
export type MediaModelType = (typeof MEDIA_MODEL_TYPES)[number];

export const MEDIA_KINDS = ["image", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export interface MediaAssetProps {
  modelType: MediaModelType;
  modelId: string;
  kind: MediaKind;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  altText: string;
  isPrimary: boolean;
  orderIndex: number;
  createdAt: Date;
}

export class MediaAsset extends Entity<MediaAssetProps> {
  private constructor(props: MediaAssetProps, id?: string) {
    super(props, id);
  }

  get modelType(): MediaModelType {
    return this.props.modelType;
  }

  get modelId(): string {
    return this.props.modelId;
  }

  get kind(): MediaKind {
    return this.props.kind;
  }

  get filename(): string {
    return this.props.filename;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get sizeBytes(): number {
    return this.props.sizeBytes;
  }

  get storageKey(): string {
    return this.props.storageKey;
  }

  get altText(): string {
    return this.props.altText;
  }

  get isPrimary(): boolean {
    return this.props.isPrimary;
  }

  get orderIndex(): number {
    return this.props.orderIndex;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  public markPrimary(): void {
    this.props.isPrimary = true;
  }

  public clearPrimary(): void {
    this.props.isPrimary = false;
  }

  public static kindFromMime(mimeType: string): MediaKind | null {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    return null;
  }

  public static create(
    props: {
      modelType: string;
      modelId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      storageKey: string;
      altText?: string;
      isPrimary?: boolean;
      orderIndex?: number;
      createdAt?: Date;
    },
    id?: string
  ): Result<MediaAsset> {
    if (!MEDIA_MODEL_TYPES.includes(props.modelType as MediaModelType)) {
      return Result.fail("Неподдерживаемый model_type. Допустимо: post, post_variant");
    }
    const kind = MediaAsset.kindFromMime(props.mimeType);
    if (!kind) {
      return Result.fail("Можно загружать только изображения и видео");
    }
    if (!props.modelId?.trim()) {
      return Result.fail("model_id обязателен");
    }

    return Result.ok(
      new MediaAsset(
        {
          modelType: props.modelType as MediaModelType,
          modelId: props.modelId,
          kind,
          filename: props.filename || "file",
          mimeType: props.mimeType,
          sizeBytes: props.sizeBytes,
          storageKey: props.storageKey,
          altText: props.altText || "",
          isPrimary: Boolean(props.isPrimary),
          orderIndex: props.orderIndex ?? 0,
          createdAt: props.createdAt ?? new Date()
        },
        id
      )
    );
  }
}
