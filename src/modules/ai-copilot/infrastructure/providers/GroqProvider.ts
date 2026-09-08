import type { ILlmProvider, LlmChatParams } from "../../domain/ILlmProvider.ts";
import { modelsForProvider } from "../../domain/aiModels.ts";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Groq OpenAI-compatible Chat Completions.
 * @see https://console.groq.com/docs/api-reference
 */
export class GroqProvider implements ILlmProvider {
  readonly id = "groq";
  readonly label = "Groq";
  readonly promptStyle = "standard" as const;

  constructor(private readonly apiKey?: string) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  supportsModel(modelId: string): boolean {
    return modelsForProvider("groq").some((m) => m.id === modelId);
  }

  async chat(params: LlmChatParams): Promise<string> {
    if (!this.apiKey) throw new Error("Нет Groq API ключа");

    const models = this.modelCandidates(params.model);
    let lastError: unknown;

    for (const model of models) {
      try {
        return await this.callModel(model, params.system, params.user);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Groq API unavailable");
  }

  private modelCandidates(preferred?: string): string[] {
    const list = modelsForProvider("groq");
    const primary = preferred && this.supportsModel(preferred) ? preferred : list[0]?.id;
    const fallback = list.find((m) => m.id === primary)?.fallbackId;
    return [...new Set([primary, fallback].filter(Boolean) as string[])];
  }

  private async callModel(model: string, system: string, user: string): Promise<string> {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.7
    };

    // Qwen: reasoning_effort=none. GPT-OSS: только low|medium|high.
    if (model.startsWith("qwen/")) {
      body.reasoning_effort = "none";
    } else if (model.includes("gpt-oss")) {
      body.reasoning_effort = "low";
    }

    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API Error (${model}): ${err}`);
    }

    const data: any = await response.json();
    const message = data?.choices?.[0]?.message || {};
    const text = String(message.content || "").trim();
    if (!text) throw new Error(`Groq API Error (${model}): empty response`);
    return text;
  }
}
