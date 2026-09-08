import { IMediaRepository } from "../domain/repositories/IMediaRepository.ts";
import { MediaAsset, MediaModelType } from "../domain/entities/MediaAsset.ts";
import { IDatabase } from "../../../shared/infrastructure/db/D1Database.ts";

export class D1MediaRepository implements IMediaRepository {
  constructor(private readonly db: IDatabase) {}

  public async save(asset: MediaAsset): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO media (
        id, model_type, model_id, kind, filename, mime_type, size_bytes,
        storage_key, alt_text, is_primary, order_index, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        asset.id,
        asset.modelType,
        asset.modelId,
        asset.kind,
        asset.filename,
        asset.mimeType,
        asset.sizeBytes,
        asset.storageKey,
        asset.altText,
        asset.isPrimary ? 1 : 0,
        asset.orderIndex,
        asset.createdAt.toISOString()
      ]
    );
  }

  public async findById(id: string): Promise<MediaAsset | null> {
    const rows = await this.db.query<any>("SELECT * FROM media WHERE id = ?", [id]);
    const row = rows.find((r) => r.id === id);
    return row ? this.toEntity(row) : null;
  }

  public async findByOwner(modelType: MediaModelType, modelId: string): Promise<MediaAsset[]> {
    const rows = await this.db.query<any>(
      "SELECT * FROM media WHERE model_type = ? AND model_id = ?",
      [modelType, modelId]
    );
    return rows
      .filter((r) => r.model_type === modelType && r.model_id === modelId)
      .sort((a, b) => a.order_index - b.order_index)
      .map((r) => this.toEntity(r))
      .filter((a): a is MediaAsset => Boolean(a));
  }

  public async findByOwners(modelType: MediaModelType, modelIds: string[]): Promise<MediaAsset[]> {
    if (modelIds.length === 0) return [];
    const all = await this.db.query<any>("SELECT * FROM media WHERE model_type = ?", [modelType]);
    const idSet = new Set(modelIds);
    return all
      .filter((r) => r.model_type === modelType && idSet.has(r.model_id))
      .sort((a, b) => a.order_index - b.order_index)
      .map((r) => this.toEntity(r))
      .filter((a): a is MediaAsset => Boolean(a));
  }

  public async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM media WHERE id = ?", [id]);
  }

  public async deleteByOwner(modelType: MediaModelType, modelId: string): Promise<MediaAsset[]> {
    const items = await this.findByOwner(modelType, modelId);
    for (const item of items) {
      await this.delete(item.id);
    }
    return items;
  }

  public async clearPrimary(modelType: MediaModelType, modelId: string): Promise<void> {
    const items = await this.findByOwner(modelType, modelId);
    for (const item of items) {
      if (!item.isPrimary) continue;
      item.clearPrimary();
      await this.save(item);
    }
  }

  private toEntity(row: any): MediaAsset | null {
    const res = MediaAsset.create(
      {
        modelType: row.model_type,
        modelId: row.model_id,
        filename: row.filename,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes) || 0,
        storageKey: row.storage_key,
        altText: row.alt_text || "",
        isPrimary: Boolean(row.is_primary),
        orderIndex: Number(row.order_index) || 0,
        createdAt: new Date(row.created_at)
      },
      row.id
    );
    return res.isSuccess ? res.getValue() : null;
  }
}
