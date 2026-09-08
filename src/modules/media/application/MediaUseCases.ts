import { IMediaRepository } from "../domain/repositories/IMediaRepository.ts";
import { IObjectStorage } from "../infrastructure/IObjectStorage.ts";
import { MediaAsset, MediaModelType } from "../domain/entities/MediaAsset.ts";
import { MediaDto, MediaMapper } from "./dtos/MediaDto.ts";
import { Result } from "../../../shared/domain/Result.ts";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 32 * 1024 * 1024;
const MAX_ATTACHMENTS = 4;

function inferMime(filename: string, mimeType: string): string {
  if (mimeType && mimeType !== "application/octet-stream") return mimeType;
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime"
  };
  return map[ext] || mimeType || "application/octet-stream";
}

export class UploadMediaUseCase {
  constructor(
    private readonly repo: IMediaRepository,
    private readonly storage: IObjectStorage
  ) {}

  public async execute(params: {
    modelType: string;
    modelId: string;
    filename: string;
    mimeType: string;
    data: ArrayBuffer;
    altText?: string;
    makePrimary?: boolean;
  }): Promise<Result<MediaDto>> {
    const mimeType = inferMime(params.filename, params.mimeType);
    const kind = MediaAsset.kindFromMime(mimeType);
    if (!kind) {
      return Result.fail("Можно загружать только изображения и видео");
    }
    const max = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (params.data.byteLength > max) {
      return Result.fail(kind === "video" ? "Видео больше 32 МБ" : "Картинка больше 8 МБ");
    }

    const id = crypto.randomUUID();
    const ext = (params.filename.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const storageKey = `${params.modelType}/${params.modelId}/${id}.${ext || "bin"}`;

    const existing = await this.repo.findByOwner(params.modelType as MediaModelType, params.modelId);
    if (existing.length >= MAX_ATTACHMENTS) {
      return Result.fail("Максимум 4 файла на пост или вариант, как в X");
    }
    const isPrimary = params.makePrimary || existing.length === 0;

    const assetRes = MediaAsset.create(
      {
        modelType: params.modelType,
        modelId: params.modelId,
        filename: params.filename,
        mimeType,
        sizeBytes: params.data.byteLength,
        storageKey,
        altText: params.altText,
        isPrimary,
        orderIndex: existing.length
      },
      id
    );
    if (assetRes.isFailure) return Result.fail(assetRes.getError());

    await this.storage.put(storageKey, params.data, mimeType);

    if (isPrimary) {
      await this.repo.clearPrimary(params.modelType as MediaModelType, params.modelId);
    }

    const asset = assetRes.getValue();
    await this.repo.save(asset);
    return Result.ok(MediaMapper.toDto(asset));
  }
}

export class ListMediaUseCase {
  constructor(private readonly repo: IMediaRepository) {}

  public async execute(modelType: string, modelId: string): Promise<Result<MediaDto[]>> {
    const items = await this.repo.findByOwner(modelType as MediaModelType, modelId);
    return Result.ok(items.map(MediaMapper.toDto));
  }
}

export class DeleteMediaUseCase {
  constructor(
    private readonly repo: IMediaRepository,
    private readonly storage: IObjectStorage
  ) {}

  public async execute(id: string): Promise<Result<void>> {
    const asset = await this.repo.findById(id);
    if (!asset) return Result.fail("Медиафайл не найден");
    await this.storage.delete(asset.storageKey);
    await this.repo.delete(id);
    return Result.ok();
  }
}

export class SetPrimaryMediaUseCase {
  constructor(private readonly repo: IMediaRepository) {}

  public async execute(id: string): Promise<Result<MediaDto>> {
    const asset = await this.repo.findById(id);
    if (!asset) return Result.fail("Медиафайл не найден");
    await this.repo.clearPrimary(asset.modelType, asset.modelId);
    asset.markPrimary();
    await this.repo.save(asset);
    return Result.ok(MediaMapper.toDto(asset));
  }
}

export class DeleteOwnerMediaUseCase {
  constructor(
    private readonly repo: IMediaRepository,
    private readonly storage: IObjectStorage
  ) {}

  public async execute(modelType: string, modelId: string): Promise<Result<void>> {
    const items = await this.repo.findByOwner(modelType as MediaModelType, modelId);
    for (const item of items) {
      await this.storage.delete(item.storageKey);
      await this.repo.delete(item.id);
    }
    return Result.ok();
  }
}
