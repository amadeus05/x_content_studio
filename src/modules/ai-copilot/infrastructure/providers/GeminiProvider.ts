import type { ILlmProvider, LlmChatParams } from "../../domain/ILlmProvider.ts";
import { modelsForProvider } from "../../domain/aiModels.ts";

export class GeminiProvider implements ILlmProvider {
  readonly id = "gemini";
  readonly label = "Google Gemini";
  readonly promptStyle = "standard" as const;

  constructor(private readonly apiKey?: string) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  supportsModel(modelId: string): boolean {
    return modelsForProvider("gemini").some((m) => m.id === modelId);
  }

  async chat(params: LlmChatParams): Promise<string> {
    if (!this.apiKey) throw new Error("Нет Gemini API ключа");

    const models = this.modelCandidates(params.model);
    let lastError: unknown;

    for (const model of models) {
      try {
        return await this.callModel(model, params.system, params.user);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Gemini API unavailable");
  }

  private modelCandidates(preferred?: string): string[] {
    const geminiModels = modelsForProvider("gemini");
    const primary = preferred && this.supportsModel(preferred) ? preferred : geminiModels[0]?.id;
    const fallback = geminiModels.find((m) => m.id === primary)?.fallbackId;
    return [...new Set([primary, fallback].filter(Boolean) as string[])];
  }

  private async callModel(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API Error (${model}): ${err}`);
    }

    const data: any = await response.json();
    const text = this.extractText(data);
    if (!text) throw new Error(`Gemini API Error (${model}): empty response`);
    return text;
  }

  private extractText(data: any): string {
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    return parts
      .filter((part: { text?: string; thought?: boolean }) => part.text && !part.thought)
      .map((part: { text: string }) => part.text)
      .join("")
      .trim();
  }
}
