export type ProviderId = "gemini" | "groq" | "cloudflare";

export type AiModel = {
  id: string;
  label: string;
  provider: ProviderId;
  /** Запасная модель того же провайдера */
  fallbackId?: string;
  /** Показывать в UI селекте */
  selectable?: boolean;
};

/**
 * Каталог моделей. Новый провайдер: ProviderId + записи сюда + класс в providers/.
 * Groq free/dev (проверено по API ключу): https://console.groq.com/docs/models
 */
export const AI_MODELS: AiModel[] = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    provider: "gemini",
    fallbackId: "gemini-3.5-flash",
    selectable: true
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    provider: "gemini",
    fallbackId: "gemini-3.5-flash",
    selectable: true
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    provider: "gemini",
    selectable: true
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    provider: "gemini",
    fallbackId: "gemini-3.5-flash",
    selectable: true
  },
  // --- Groq (бесплатный developer tier, проверено chat/completions) ---
  {
    id: "qwen/qwen3.8-27b",
    label: "Qwen 3.8 27B · Groq",
    provider: "groq",
    fallbackId: "qwen/qwen3.6-27b",
    selectable: true
  },
  {
    id: "qwen/qwen3.6-27b",
    label: "Qwen 3.6 27B · Groq",
    provider: "groq",
    fallbackId: "openai/gpt-oss-20b",
    selectable: true
  },
  {
    id: "openai/gpt-oss-20b",
    label: "GPT-OSS 20B · Groq",
    provider: "groq",
    fallbackId: "openai/gpt-oss-120b",
    selectable: true
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B · Groq",
    provider: "groq",
    fallbackId: "allam-2-7b",
    selectable: true
  },
  {
    id: "allam-2-7b",
    label: "ALLaM 2 7B · Groq",
    provider: "groq",
    selectable: true
  },
  {
    id: "@cf/meta/llama-4-scout-17b-16e-instruct",
    label: "CF Llama 4 Scout",
    provider: "cloudflare",
    selectable: false
  },
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    label: "CF Llama 3.3 70B",
    provider: "cloudflare",
    selectable: false
  },
  {
    id: "@cf/meta/llama-3.1-8b-instruct-fast",
    label: "CF Llama 3.1 8B",
    provider: "cloudflare",
    selectable: false
  }
];

export const DEFAULT_AI_MODEL_ID = "gemini-3.8-flash";

export function listSelectableModels(): AiModel[] {
  return AI_MODELS.filter((m) => m.selectable !== false);
}

export function getAiModel(id?: string | null): AiModel | undefined {
  if (!id) return undefined;
  return AI_MODELS.find((m) => m.id === id);
}

export function resolveAiModel(value?: string | null): AiModel {
  return getAiModel(value) || getAiModel(DEFAULT_AI_MODEL_ID) || AI_MODELS[0];
}

/** Только модели из UI-селекта (игнор скрытых CF и мусор из localStorage). */
export function resolveSelectableAiModel(value?: string | null): AiModel {
  const found = getAiModel(value);
  if (found && found.selectable !== false) return found;
  return getAiModel(DEFAULT_AI_MODEL_ID) || listSelectableModels()[0] || AI_MODELS[0];
}

export function modelsForProvider(provider: ProviderId): AiModel[] {
  return AI_MODELS.filter((m) => m.provider === provider);
}
