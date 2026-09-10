import type { ChatSession, ChatMessage, ConversationContext } from "../domain/ChatSession.ts";
import { CHAT_HISTORY_LIMIT, DEFAULT_BOT_MODEL_ID } from "../domain/ChatSession.ts";

// Минимальный тип KV для совместимости с Cloudflare KV и MemoryKV
interface IKvStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Хранилище сессий и истории чата через Cloudflare KV.
 *
 * Ключи:
 *   bot_session:{chatId}  → ChatSession (мета без history)
 *   bot_history:{chatId}  → ChatMessage[] (последние CHAT_HISTORY_LIMIT сообщений)
 */
export class TelegramKvStore {
  private readonly kv: IKvStore;

  constructor(kv: any) {
    // Если KV не передан (локальная разработка без miniflare) — используем in-memory заглушку
    this.kv = kv || new MemoryKvFallback();
  }

  // ─── Session ──────────────────────────────────────────────────────────────

  public async getSession(chatId: number): Promise<ChatSession> {
    const raw = await this.kv.get(`bot_session:${chatId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ChatSession;
        // Backward compat: старые сессии без context
        if (!parsed.context) parsed.context = {};
        return parsed;
      } catch {
        // fall through to default
      }
    }
    return this.defaultSession(chatId);
  }

  public async saveSession(session: ChatSession): Promise<void> {
    // Сохраняем мету без history (history хранится отдельно — экономим KV-пропускную способность)
    const { history: _h, ...meta } = session;
    await this.kv.put(`bot_session:${session.chatId}`, JSON.stringify({ ...meta, history: [] }), {
      // Сессия живёт 30 дней без активности
      expirationTtl: 30 * 24 * 60 * 60
    });
  }

  /** Частичное обновление ConversationContext без перезаписи всей сессии */
  public async updateContext(chatId: number, patch: Partial<ConversationContext>): Promise<void> {
    const session = await this.getSession(chatId);
    session.context = { ...session.context, ...patch };
    session.updatedAt = new Date().toISOString();
    await this.saveSession(session);
  }

  public async setModel(chatId: number, modelId: string): Promise<void> {
    const session = await this.getSession(chatId);
    session.modelId = modelId;
    session.updatedAt = new Date().toISOString();
    await this.saveSession(session);
  }

  // ─── History ──────────────────────────────────────────────────────────────

  public async getHistory(chatId: number): Promise<ChatMessage[]> {
    const raw = await this.kv.get(`bot_history:${chatId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ChatMessage[];
    } catch {
      return [];
    }
  }

  public async appendMessage(chatId: number, message: ChatMessage): Promise<ChatMessage[]> {
    const history = await this.getHistory(chatId);
    history.push(message);

    // Скользящее окно — обрезаем старые сообщения
    const windowed = history.slice(-CHAT_HISTORY_LIMIT);
    await this.saveHistory(chatId, windowed);
    return windowed;
  }

  public async clearHistory(chatId: number): Promise<void> {
    await this.kv.delete(`bot_history:${chatId}`);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async saveHistory(chatId: number, history: ChatMessage[]): Promise<void> {
    await this.kv.put(`bot_history:${chatId}`, JSON.stringify(history), {
      expirationTtl: 7 * 24 * 60 * 60 // 7 дней
    });
  }

  private defaultSession(chatId: number): ChatSession {
    return {
      chatId,
      modelId: DEFAULT_BOT_MODEL_ID,
      history: [],
      context: {},
      updatedAt: new Date().toISOString()
    };
  }
}

/**
 * Заглушка для локальной разработки когда MEDIA_KV недоступен.
 * Данные хранятся только в памяти процесса.
 */
class MemoryKvFallback implements IKvStore {
  private readonly store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
