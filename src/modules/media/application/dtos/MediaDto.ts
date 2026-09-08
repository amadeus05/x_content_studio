import { MediaAsset } from "../../domain/entities/MediaAsset.ts";

export interface MediaDto {
  id: string;
  modelType: string;
  modelId: string;
  kind: "image" | "video";
  filename: string;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  isPrimary: boolean;
  orderIndex: number;
  url: string;
  createdAt: string;
}

export class MediaMapper {
  public static toDto(asset: MediaAsset): MediaDto {
    return {
      id: asset.id,
      modelType: asset.modelType,
      modelId: asset.modelId,
      kind: asset.kind,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      altText: asset.altText,
      isPrimary: asset.isPrimary,
      orderIndex: asset.orderIndex,
      url: `/api/media/${asset.id}/file`,
      createdAt: asset.createdAt.toISOString()
    };
  }
}
