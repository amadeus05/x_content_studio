import { IAiService, CritiqueResult, AiGenerationMeta, AiResult } from "../domain/services/IAiService.ts";
import type { ILlmProvider } from "../domain/ILlmProvider.ts";
import { getAiModel, modelsForProvider, resolveAiModel, type AiModel, type ProviderId } from "../domain/aiModels.ts";
import {
  critiqueSystemPrompt,
  critiqueUserPrompt,
  hooksMergedPrompt,
  hooksSystemPrompt,
  hooksUserPrompt,
  pingSystemPrompt,
  pingUserPrompt,
  polishMergedPrompt,
  polishSystemPrompt,
  polishUserPrompt,
  threadSystemPrompt,
  threadUserPrompt
} from "../domain/prompts.ts";
import { createProviderRegistry, ProviderRegistry } from "./ProviderRegistry.ts";
import { parseCritiqueJson, parseHookList, parseThread } from "./responseParsers.ts";

export interface AiOrchestratorConfig {
  cloudflareAi?: any;
  geminiApiKey?: string;
  groqApiKey?: string;
  preferredModel?: string;
}

/**
 * Оркестратор: общие промпты → registry → парсеры → LocalFallback.
 * Стиль промпта: provider.promptStyle ("standard" | "merged").
 */
export class AiOrchestrator implements IAiService {
  private readonly registry: ProviderRegistry;

  constructor(private readonly config: AiOrchestratorConfig = {}) {
    this.registry = createProviderRegistry({
      geminiApiKey: config.geminiApiKey,
      groqApiKey: config.groqApiKey,
      cloudflareAi: config.cloudflareAi
    });
  }

  public async generateHooks(params: {
    text: string;
    toneGuidance?: string;
    count?: number;
  }): Promise<AiResult<string[]>> {
    const count = params.count || 3;
    const preferred = resolveAiModel(this.config.preferredModel);

    for (const provider of this.registry.chatProvidersFor(preferred)) {
      const usedModelId = this.modelIdFor(preferred, provider);
      try {
        const text =
          provider.promptStyle === "merged"
            ? await provider.chat({
                system: "Ты копирайтер для X.",
                user: hooksMergedPrompt(params.text, count, params.toneGuidance),
                model: usedModelId
              })
            : await provider.chat({
                system: hooksSystemPrompt(count, params.toneGuidance),
                user: hooksUserPrompt(params.text),
                model: usedModelId
              });

        const hooks = parseHookList(text, count);
        if (hooks.length > 0) {
          return { data: hooks, meta: this.llmMeta(provider, usedModelId) };
        }
      } catch (err) {
        this.warnProvider(provider, "hooks", err);
      }
    }

    return {
      data: this.registry.local.generateHooks(params.text, count),
      meta: this.localMeta()
    };
  }

  public async polishContent(params: {
    text: string;
    instructions: string;
    toneGuidance?: string;
  }): Promise<AiResult<string>> {
    const preferred = resolveAiModel(this.config.preferredModel);

    for (const provider of this.registry.chatProvidersFor(preferred)) {
      const usedModelId = this.modelIdFor(preferred, provider);
      try {
        const text =
          provider.promptStyle === "merged"
            ? await provider.chat({
                system: "Ты редактор твитов.",
                user: polishMergedPrompt(params.text, params.instructions, params.toneGuidance),
                model: usedModelId
              })
            : await provider.chat({
                system: polishSystemPrompt(params.instructions, params.toneGuidance),
                user: polishUserPrompt(params.text),
                model: usedModelId
              });

        const trimmed = text.trim();
        if (trimmed) {
          return { data: trimmed, meta: this.llmMeta(provider, usedModelId) };
        }
      } catch (err) {
        this.warnProvider(provider, "polish", err);
      }
    }

    return {
      data: this.registry.local.polish(params.text, params.instructions),
      meta: this.localMeta()
    };
  }

  public async critiqueContent(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<AiResult<CritiqueResult>> {
    const preferred = resolveAiModel(this.config.preferredModel);

    for (const provider of this.registry.chatProvidersFor(preferred)) {
      const usedModelId = this.modelIdFor(preferred, provider);
      try {
        const raw = await provider.chat({
          system: critiqueSystemPrompt(),
          user: critiqueUserPrompt(params.text),
          model: usedModelId
        });
        const parsed = parseCritiqueJson(raw);
        if (parsed) {
          return { data: parsed, meta: this.llmMeta(provider, usedModelId) };
        }
        console.warn(`[AI] Provider ${provider.id} critique: JSON parse/validation failed`);
      } catch (err) {
        this.warnProvider(provider, "critique", err);
      }
    }

    return {
      data: this.registry.local.critique(params.text),
      meta: this.localMeta()
    };
  }

  public async expandToThread(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<AiResult<string[]>> {
    const preferred = resolveAiModel(this.config.preferredModel);

    for (const provider of this.registry.chatProvidersFor(preferred)) {
      const usedModelId = this.modelIdFor(preferred, provider);
      try {
        const raw = await provider.chat({
          system: threadSystemPrompt(),
          user: threadUserPrompt(params.text),
          model: usedModelId
        });
        const tweets = parseThread(raw);
        if (tweets.length > 0) {
          return { data: tweets, meta: this.llmMeta(provider, usedModelId) };
        }
      } catch (err) {
        this.warnProvider(provider, "thread", err);
      }
    }

    return {
      data: this.registry.local.expandThread(params.text),
      meta: this.localMeta()
    };
  }

  public async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> {
    const preferred = resolveAiModel(this.config.preferredModel);
    const providers = this.registry.chatProvidersFor(preferred);

    if (providers.length === 0) {
      return { success: false, error: "Нет доступных AI-провайдеров (нужен API-ключ)" };
    }

    const provider = providers[0];
    const usedModelId = this.modelIdFor(preferred, provider);
    try {
      const text = await provider.chat({
        system: pingSystemPrompt(),
        user: pingUserPrompt(),
        model: usedModelId
      });
      return { success: Boolean(text), model: usedModelId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private modelIdFor(preferred: AiModel, provider: ILlmProvider): string {
    if (preferred.provider === provider.id) return preferred.id;
    const models = modelsForProvider(provider.id as ProviderId);
    return models.find((m) => m.selectable !== false)?.id || models[0]?.id || provider.id;
  }

  private llmMeta(provider: ILlmProvider, modelId: string): AiGenerationMeta {
    const def = getAiModel(modelId);
    return {
      providerId: provider.id,
      modelId,
      label: def?.label || `${provider.label} · ${modelId}`,
      source: "llm"
    };
  }

  private localMeta(): AiGenerationMeta {
    return {
      providerId: "local",
      modelId: "local",
      label: "Локальный фолбэк",
      source: "local"
    };
  }

  private warnProvider(provider: ILlmProvider, task: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[AI] Provider ${provider.id} failed (${task}):`, message);
  }
}
