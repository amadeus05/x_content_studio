import { IObjectStorage, StoredObject } from "./IObjectStorage.ts";

export class R2ObjectStorage implements IObjectStorage {
  constructor(private readonly bucket: any) {}

  public async put(key: string, data: ArrayBuffer, mimeType: string): Promise<void> {
    await this.bucket.put(key, data, {
      httpMetadata: { contentType: mimeType }
    });
  }

  public async get(key: string): Promise<StoredObject | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    const body = await obj.arrayBuffer();
    const mimeType = obj.httpMetadata?.contentType || "application/octet-stream";
    return { body, mimeType };
  }

  public async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
