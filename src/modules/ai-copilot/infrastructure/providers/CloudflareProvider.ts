import type { ILlmProvider, LlmChatParams } from "../../domain/ILlmProvider.ts";
import { modelsForProvider } from "../../domain/aiModels.ts";

export class CloudflareProvider implements ILlmProvider {
  readonly id = "cloudflare";
  readonly label = "Cloudflare Workers AI";
  readonly promptStyle = "merged" as const;

  constructor(private readonly ai?: any) {}

  isAvailable(): boolean {
    return Boolean(this.ai);
  }

  supportsModel(modelId: string): boolean {
    return modelsForProvider("cloudflare").some((m) => m.id === modelId);
  }

  async chat(params: LlmChatParams): Promise<string> {
    if (!this.ai) throw new Error("Cloudflare AI binding is missing");

    const models = this.modelCandidates(params.model);
    let lastError: unknown;

    for (const model of models) {
      try {
        const prompt = `${params.system}\n\n${params.user}`;
        const result: any = await this.ai.run(model, {
          messages: [{ role: "user", content: prompt }]
        });
        const output = result?.response || result?.result?.response || "";
        if (output) return String(output);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Cloudflare AI unavailable");
  }

  private modelCandidates(preferred?: string): string[] {
    const list = modelsForProvider("cloudflare").map((m) => m.id);
    if (preferred && list.includes(preferred)) {
      return [preferred, ...list.filter((id) => id !== preferred)];
    }
    return list;
  }
}
