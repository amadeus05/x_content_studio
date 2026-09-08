export interface StoredObject {
  body: ArrayBuffer;
  mimeType: string;
}

export interface IObjectStorage {
  put(key: string, data: ArrayBuffer, mimeType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}
