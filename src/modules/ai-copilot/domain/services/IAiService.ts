export interface CritiqueResult {
  score: number; // 1-10
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  suggestedRewrite: string;
}

/** Кто реально ответил на запрос копилота. */
export type AiGenerationMeta = {
  providerId: string;
  modelId: string;
  label: string;
  source: "llm" | "local";
};

export type AiResult<T> = {
  data: T;
  meta: AiGenerationMeta;
};

/** Одно сообщение в multi-turn диалоге */
export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Расширенный сервис с поддержкой истории сообщений (для Telegram-бота) */
export interface IAiServiceWithHistory extends IAiService {
  chatWithHistory(params: {
    messages: ChatHistoryMessage[];
    modelId?: string;
    /** Опциональный системный промпт (переопределяет дефолтный) */
    systemPrompt?: string;
  }): Promise<AiResult<string>>;
}

export interface IAiService {
  generateHooks(params: {
    text: string;
    toneGuidance?: string;
    count?: number;
  }): Promise<AiResult<string[]>>;

  polishContent(params: {
    text: string;
    instructions: string;
    toneGuidance?: string;
  }): Promise<AiResult<string>>;

  critiqueContent(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<AiResult<CritiqueResult>>;

  expandToThread(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<AiResult<string[]>>;

  testConnection(): Promise<{ success: boolean; model?: string; error?: string }>;
}
