import { IAiService, CritiqueResult, AiGenerationMeta, AiResult, IAiServiceWithHistory, ChatHistoryMessage } from "../domain/services/IAiService.ts";
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
export class AiOrchestrator implements IAiServiceWithHistory {
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

  /**
   * Multi-turn чат с полной историей сообщений (для Telegram-бота).
   * Gemini: contents[] с roles user/model.
   * Groq/OpenAI-compatible: messages[] с roles user/assistant.
   * Fallback: отправляем последнее user-сообщение через обычный chat().
   */
  public async chatWithHistory(params: {
    messages: ChatHistoryMessage[];
    modelId?: string;
    systemPrompt?: string;
  }): Promise<AiResult<string>> {
    const preferred = resolveAiModel(params.modelId);
    const defaultSystem = "Ты полезный AI-ассистент. Отвечай конкретно и по делу.";
    const system = params.systemPrompt || defaultSystem;
    const messages = params.messages;

    for (const provider of this.registry.chatProvidersFor(preferred)) {
      const usedModelId = this.modelIdFor(preferred, provider);
      try {
        let text: string;

        if (provider.id === "gemini") {
          // Gemini: native multi-turn через contents[]
          text = await this.chatWithHistoryGemini(
            provider as any, usedModelId, system, messages
          );
        } else if (provider.id === "groq") {
          // Groq: OpenAI-compatible messages[]
          text = await this.chatWithHistoryGroq(
            provider as any, usedModelId, system, messages
          );
        } else {
          // Для остальных (напр. Cloudflare) — отправляем последнее сообщение через обычный chat()
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          text = await provider.chat({
            system,
            user: lastUser?.content || "",
            model: usedModelId
          });
        }

        if (text.trim()) {
          return { data: text.trim(), meta: this.llmMeta(provider, usedModelId) };
        }
      } catch (err) {
        this.warnProvider(provider, "chatWithHistory", err);
      }
    }

    // Local fallback — отражаем последнее сообщение
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return {
      data: `[Офлайн-режим] Не удалось обратиться к AI. Ваш вопрос: "${lastUser?.content || ''}"`,
      meta: this.localMeta()
    };
  }

  private async chatWithHistoryGemini(
    provider: any,
    modelId: string,
    system: string,
    messages: ChatHistoryMessage[]
  ): Promise<string> {
    if (!provider.apiKey) throw new Error("Нет Gemini API ключа");

    // Gemini: system — в systemInstruction, history — в contents[]
    const contents = messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${provider.apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Gemini chatHistory Error (${modelId}): ${err}`);
    }

    const data: any = await resp.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    return parts
      .filter((p: any) => p.text && !p.thought)
      .map((p: any) => p.text)
      .join("")
      .trim();
  }

  private async chatWithHistoryGroq(
    provider: any,
    modelId: string,
    system: string,
    messages: ChatHistoryMessage[]
  ): Promise<string> {
    if (!provider.apiKey) throw new Error("Нет Groq API ключа");

    const apiMessages = [
      { role: "system", content: system },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ];

    const body: Record<string, unknown> = {
      model: modelId,
      messages: apiMessages,
      temperature: 0.7
    };
    if (modelId.startsWith("qwen/")) body.reasoning_effort = "none";
    else if (modelId.includes("gpt-oss")) body.reasoning_effort = "low";

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Groq chatHistory Error (${modelId}): ${err}`);
    }

    const data: any = await resp.json();
    return String(data?.choices?.[0]?.message?.content || "").trim();
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
