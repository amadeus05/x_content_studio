import type { ILlmProvider } from "../domain/ILlmProvider.ts";
import type { AiModel, ProviderId } from "../domain/aiModels.ts";
import { GeminiProvider } from "./providers/GeminiProvider.ts";
import { CloudflareProvider } from "./providers/CloudflareProvider.ts";
import { LocalFallback } from "./providers/LocalFallback.ts";

export type ProviderRegistryConfig = {
  geminiApiKey?: string;
  cloudflareAi?: any;
};

export type ProviderRegistry = {
  get(id: ProviderId | string): ILlmProvider | undefined;
  /** Доступные LLM-провайдеры в порядке попыток под выбранную модель */
  chatProvidersFor(preferred: AiModel): ILlmProvider[];
  local: LocalFallback;
  all: ILlmProvider[];
};

/**
 * Собирает LLM-провайдеры (+ отдельный LocalFallback).
 * Новый провайдер: ILlmProvider → AI_MODELS → new XxxProvider(...) здесь.
 */
export function createProviderRegistry(config: ProviderRegistryConfig = {}): ProviderRegistry {
  const gemini = new GeminiProvider(config.geminiApiKey);
  const cloudflare = new CloudflareProvider(config.cloudflareAi);
  const local = new LocalFallback();

  const byId = new Map<string, ILlmProvider>([
    [gemini.id, gemini],
    [cloudflare.id, cloudflare]
  ]);

  const chatOrder: ILlmProvider[] = [gemini, cloudflare];

  return {
    get(id) {
      return byId.get(id);
    },
    local,
    all: [...byId.values()],
    chatProvidersFor(preferred) {
      const preferredProvider = byId.get(preferred.provider);
      const rest = chatOrder.filter((p) => p.id !== preferred.provider);
      const ordered = preferredProvider ? [preferredProvider, ...rest] : [...chatOrder];
      return ordered.filter((p) => p.isAvailable());
    }
  };
}
