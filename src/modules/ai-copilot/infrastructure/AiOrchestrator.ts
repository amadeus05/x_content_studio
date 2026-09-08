import { IAiService, CritiqueResult } from "../domain/services/IAiService.ts";
import type { ILlmProvider } from "../domain/ILlmProvider.ts";
import { resolveAiModel } from "../domain/aiModels.ts";
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
      cloudflareAi: config.cloudflareAi
    });
  }

  public async generateHooks(params: {
    text: string;
    toneGuidance?: string;
    count?: number;
  }): Promise<string[]> {
    const count = params.count || 3;
    const preferred = resolveAiModel(this.config.preferredModel);

    for (const provider of this.registry.chatProvidersFor(preferred)) {
      try {
        const model = preferred.provider === provider.id ? preferred.id : undefined;
        const text =
          provider.promptStyle === "merged"
            ? await provider.chat({
                system: "Ты копирайтер для X.",
                user: hooksMergedPrompt(params.text, count, params.toneGuidance),
                model
              })
            : await provider.chat({
                system: hooksSystemPrompt(count, params.toneGuidance),
                user: hooksUserPrompt(params.text),
                model
              });

        const hooks = parseHookList(text, count);
        if (hooks.length > 0) return hooks;
      } catch (err) {
        this.warnProvider(provider, "hooks", err);
      }
    }

    return this.registry.local.generateHooks(params.text, count);
  }

  public async polishContent(params: {
    text: string;
    instructions: string;
    toneGuidance?: string;
  }): Promise<string> {
    const preferred = resolveAiModel(this.config.preferredModel);

    for (const provider of this.registry.chatProvidersFor(preferred)) {
      try {
        const model = preferred.provider === provider.id ? preferred.id : undefined;
        const text =
          provider.promptStyle === "merged"
            ? await provider.chat({
                system: "Ты редактор твитов.",
                user: polishMergedPrompt(params.text, params.instructions, params.toneGuidance),
                model
              })
            : await provider.chat({
                system: polishSystemPrompt(params.instructions, params.toneGuidance),
                user: polishUserPrompt(params.text),
                model
              });

        const trimmed = text.trim();
        if (trimmed) return trimmed;
      } catch (err) {
        this.warnProvider(provider, "polish", err);
      }
    }

    return this.registry.local.polish(params.text, params.instructions);
  }

  public async critiqueContent(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<CritiqueResult> {
    const preferred = resolveAiModel(this.config.preferredModel);

    for (const provider of this.registry.chatProvidersFor(preferred)) {
      try {
        const raw = await provider.chat({
          system: critiqueSystemPrompt(),
          user: critiqueUserPrompt(params.text),
          model: preferred.provider === provider.id ? preferred.id : undefined
        });
        const parsed = parseCritiqueJson(raw);
        if (parsed) return parsed;
        console.warn(`[AI] Provider ${provider.id} critique: JSON parse/validation failed`);
      } catch (err) {
        this.warnProvider(provider, "critique", err);
      }
    }

    return this.registry.local.critique(params.text);
  }

  public async expandToThread(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<string[]> {
    const preferred = resolveAiModel(this.config.preferredModel);

    for (const provider of this.registry.chatProvidersFor(preferred)) {
      try {
        const raw = await provider.chat({
          system: threadSystemPrompt(),
          user: threadUserPrompt(params.text),
          model: preferred.provider === provider.id ? preferred.id : undefined
        });
        const tweets = parseThread(raw);
        if (tweets.length > 0) return tweets;
      } catch (err) {
        this.warnProvider(provider, "thread", err);
      }
    }

    return this.registry.local.expandThread(params.text);
  }

  public async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> {
    const preferred = resolveAiModel(this.config.preferredModel);
    const providers = this.registry.chatProvidersFor(preferred);

    if (providers.length === 0) {
      return { success: false, error: "Нет доступных AI-провайдеров (нужен API-ключ)" };
    }

    const provider = providers[0];
    try {
      const text = await provider.chat({
        system: pingSystemPrompt(),
        user: pingUserPrompt(),
        model: preferred.provider === provider.id ? preferred.id : undefined
      });
      return {
        success: Boolean(text),
        model: preferred.provider === provider.id ? preferred.id : provider.id
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private warnProvider(provider: ILlmProvider, task: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[AI] Provider ${provider.id} failed (${task}):`, message);
  }
}
