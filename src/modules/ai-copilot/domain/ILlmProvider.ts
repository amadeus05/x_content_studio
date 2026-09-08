export type LlmPromptStyle = "standard" | "merged";

export type LlmChatParams = {
  system: string;
  user: string;
  /** Конкретная модель провайдера; если нет — дефолт провайдера */
  model?: string;
};

/**
 * Контракт LLM-провайдера (реальный API).
 * Эвристический офлайн-фолбэк — отдельно: LocalFallback.
 */
export interface ILlmProvider {
  readonly id: string;
  readonly label: string;
  /**
   * standard — system + user раздельно (как в промптах).
   * merged — один жёсткий user-промпт (слабые/CF-модели).
   */
  readonly promptStyle: LlmPromptStyle;

  isAvailable(): boolean;
  supportsModel(modelId: string): boolean;
  chat(params: LlmChatParams): Promise<string>;
}
