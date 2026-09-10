/** Одно сообщение в истории чата */
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Контекст текущего разговора: что «активно» прямо сейчас.
 * Позволяет системе понимать «его», «третий», «сделай короче» без explicit ID.
 */
export interface ConversationContext {
  /** ID задачи создания (PostId последнего созданного поста) */
  taskId?: string;
  /** Последний определённый intent */
  intent?: string;
  /** ID активного поста */
  postId?: string;
  /** ID активного варианта (hookId или variantId) */
  variantId?: string;
  /** ID активной версии (bodyId) */
  versionId?: string;
  /** Количество вариантов в последней генерации */
  variantCount?: number;
}

/** Состояние сессии пользователя в боте */
export interface ChatSession {
  /** Telegram chat_id (число) */
  chatId: number;
  /** ID выбранной модели из AI_MODELS */
  modelId: string;
  /** История сообщений (скользящее окно) */
  history: ChatMessage[];
  /** Контекст текущего разговора (активный пост, вариант и т.д.) */
  context: ConversationContext;
  /** ISO timestamp последнего обновления */
  updatedAt: string;
}

/** Максимальное количество сообщений в истории (скользящее окно) */
export const CHAT_HISTORY_LIMIT = 20;

/** ID модели по умолчанию для новых сессий */
export const DEFAULT_BOT_MODEL_ID = "gemini-3.8-flash";
