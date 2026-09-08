import { MediaAsset, MediaModelType } from "../entities/MediaAsset.ts";

export interface IMediaRepository {
  save(asset: MediaAsset): Promise<void>;
  findById(id: string): Promise<MediaAsset | null>;
  findByOwner(modelType: MediaModelType, modelId: string): Promise<MediaAsset[]>;
  findByOwners(modelType: MediaModelType, modelIds: string[]): Promise<MediaAsset[]>;
  delete(id: string): Promise<void>;
  deleteByOwner(modelType: MediaModelType, modelId: string): Promise<MediaAsset[]>;
  clearPrimary(modelType: MediaModelType, modelId: string): Promise<void>;
}
