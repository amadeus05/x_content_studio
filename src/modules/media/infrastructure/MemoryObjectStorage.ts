import { IObjectStorage, StoredObject } from "./IObjectStorage.ts";

const STORE_KEY = "__xManagerMediaBlobs";

export class MemoryObjectStorage implements IObjectStorage {
  private blobs: Map<string, StoredObject>;

  constructor() {
    const g = globalThis as Record<string, unknown>;
    if (!g[STORE_KEY]) {
      g[STORE_KEY] = new Map<string, StoredObject>();
    }
    this.blobs = g[STORE_KEY] as Map<string, StoredObject>;
  }

  public async put(key: string, data: ArrayBuffer, mimeType: string): Promise<void> {
    this.blobs.set(key, { body: data, mimeType });
  }

  public async get(key: string): Promise<StoredObject | null> {
    return this.blobs.get(key) ?? null;
  }

  public async delete(key: string): Promise<void> {
    this.blobs.delete(key);
  }
}
