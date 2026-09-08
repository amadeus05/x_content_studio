import { IObjectStorage, StoredObject } from "./IObjectStorage.ts";

const CHUNK_BYTES = 20 * 1024 * 1024;

interface ChunkMeta {
  mimeType: string;
  size: number;
  chunks: number;
}

export class KvObjectStorage implements IObjectStorage {
  constructor(private readonly kv: any) {}

  public async put(key: string, data: ArrayBuffer, mimeType: string): Promise<void> {
    const chunks = Math.max(1, Math.ceil(data.byteLength / CHUNK_BYTES));
    if (chunks === 1) {
      await this.kv.put(key, data, {
        metadata: { mimeType, chunks: 1, size: data.byteLength }
      });
      return;
    }

    await this.kv.put(this.metaKey(key), JSON.stringify({ mimeType, size: data.byteLength, chunks } satisfies ChunkMeta));
    for (let i = 0; i < chunks; i++) {
      const start = i * CHUNK_BYTES;
      const slice = data.slice(start, Math.min(start + CHUNK_BYTES, data.byteLength));
      await this.kv.put(this.chunkKey(key, i), slice);
    }
    await this.kv.delete(key);
  }

  public async get(key: string): Promise<StoredObject | null> {
    const direct = await this.kv.getWithMetadata<ChunkMeta>(key, { type: "arrayBuffer" });
    if (direct.value) {
      const mimeType = direct.metadata?.mimeType || "application/octet-stream";
      return { body: direct.value, mimeType };
    }

    const rawMeta = await this.kv.get(this.metaKey(key));
    if (!rawMeta) return null;
    const meta = JSON.parse(rawMeta) as ChunkMeta;
    const parts: ArrayBuffer[] = [];
    for (let i = 0; i < meta.chunks; i++) {
      const part = await this.kv.get(this.chunkKey(key, i), { type: "arrayBuffer" });
      if (!part) return null;
      parts.push(part);
    }
    return { body: this.concat(parts), mimeType: meta.mimeType };
  }

  public async delete(key: string): Promise<void> {
    const rawMeta = await this.kv.get(this.metaKey(key));
    await this.kv.delete(key);
    await this.kv.delete(this.metaKey(key));
    if (!rawMeta) return;
    const meta = JSON.parse(rawMeta) as ChunkMeta;
    await Promise.all(
      Array.from({ length: meta.chunks }, (_, i) => this.kv.delete(this.chunkKey(key, i)))
    );
  }

  private metaKey(key: string): string {
    return `${key}#meta`;
  }

  private chunkKey(key: string, index: number): string {
    return `${key}#${index}`;
  }

  private concat(parts: ArrayBuffer[]): ArrayBuffer {
    const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(new Uint8Array(part), offset);
      offset += part.byteLength;
    }
    return out.buffer;
  }
}
