import type { IAiServiceWithHistory } from "../../../ai-copilot/domain/services/IAiService.ts";

// ─── System Prompts ─────────────────────────────────────────────────────────

export const CONTENT_CREATION_SYSTEM_PROMPT = `Ты профессиональный копирайтер для X (Twitter) / Telegram.
Твоя задача — написать виральный пост.
Формат ответа — строго JSON (никаких markdown-блоков вокруг):
{
  "hook": "<цепляющий первый твит / заголовок, до 280 символов>",
  "body": "<основной текст поста, 1-5 абзацев>"
}
Пиши живо, конкретно, без воды.`;

export function buildVariantSystemPrompt(
  tone: string[],
  variantIndex: number,
  totalVariants: number
): string {
  const toneHint = tone.length > 0 ? `Тональность для этого варианта: ${tone.join(", ")}.` : "";
  return `${CONTENT_CREATION_SYSTEM_PROMPT}
${toneHint}
Это вариант ${variantIndex + 1} из ${totalVariants}. Сделай его кардинально отличным от других вариантов.`;
}

export const EDIT_POST_SYSTEM_PROMPT = `Ты редактор постов для X (Twitter).
Инструкция по доработке: %INSTRUCTION%
Правило: пост должен быть ритмичным, кратким (до 280 символов или около того), с сильным ритмом.
Верни ТОЛЬКО финальный текст — без пояснений.`;

// ─── Runtime JSON Validation ─────────────────────────────────────────────────

export interface GeneratedPostContent {
  hook: string;
  body: string;
}

/**
 * Runtime validation of unknown parsed JSON for post content.
 * Does not trust any type casts.
 */
export function isValidPostJson(value: unknown): value is { hook: string; body: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.hook === "string" &&
    obj.hook.trim().length > 0 &&
    typeof obj.body === "string" &&
    obj.body.trim().length > 0
  );
}

/**
 * Parses and validates raw LLM text into hook and body.
 * Falls back safely without throwing.
 */
export function parseAndValidatePostJson(raw: string, fallbackTopic: string): GeneratedPostContent {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      if (isValidPostJson(parsed)) {
        return {
          hook: parsed.hook.trim().slice(0, 280),
          body: parsed.body.trim()
        };
      }
    } catch {
      // JSON parse failure, fallback below
    }
  }

  // Graceful fallback for non-JSON or invalid schema output
  return {
    hook: `🚀 ${fallbackTopic}`.slice(0, 280),
    body: raw.trim()
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export interface GenerateVariantsParams {
  topic: string;
  tone: string[];
  count: number;
  modelId?: string;
}

export interface EditContentParams {
  currentText: string;
  instruction: string;
  modelId?: string;
}

export interface RegenerateContentParams {
  topic: string;
  instruction?: string;
  modelId?: string;
}

export class ContentAiGenerator {
  constructor(private readonly aiService: IAiServiceWithHistory) {}

  /**
   * Generates multiple post variants in parallel.
   */
  public async generateVariants(params: GenerateVariantsParams): Promise<GeneratedPostContent[]> {
    const { topic, tone, count, modelId } = params;
    const total = Math.max(1, Math.min(count, 10));

    const promises = Array.from({ length: total }, async (_, index) => {
      const systemPrompt = buildVariantSystemPrompt(tone, index, total);
      const result = await this.aiService.chatWithHistory({
        messages: [{ role: "user", content: `Напиши пост на тему: "${topic}"` }],
        modelId,
        systemPrompt
      });
      return parseAndValidatePostJson(result.data, topic);
    });

    const settled = await Promise.allSettled(promises);
    const successful: GeneratedPostContent[] = [];

    for (const item of settled) {
      if (item.status === "fulfilled") {
        successful.push(item.value);
      }
    }

    return successful;
  }

  /**
   * Refines/edits existing content based on user instructions.
   */
  public async editContent(params: EditContentParams): Promise<GeneratedPostContent> {
    const { currentText, instruction, modelId } = params;
    const systemPrompt = EDIT_POST_SYSTEM_PROMPT.replace("%INSTRUCTION%", instruction);

    const editResult = await this.aiService.chatWithHistory({
      messages: [{ role: "user", content: `Исходный текст:\n${currentText}` }],
      modelId,
      systemPrompt
    });

    const newText = editResult.data.trim();
    const lines = newText.split("\n").filter((l) => l.trim());
    const newHook = lines[0] || newText;
    const newBody = lines.slice(1).join("\n").trim() || newText;

    return {
      hook: newHook.slice(0, 280),
      body: newBody
    };
  }

  /**
   * Regenerates a single post on a topic with optional instruction.
   */
  public async regenerateContent(params: RegenerateContentParams): Promise<GeneratedPostContent> {
    const { topic, instruction, modelId } = params;
    const extraInstruction = instruction ? ` Учти: ${instruction}.` : "";

    const regenResult = await this.aiService.chatWithHistory({
      messages: [{ role: "user", content: `Напиши пост на тему: "${topic}"${extraInstruction}` }],
      modelId,
      systemPrompt: CONTENT_CREATION_SYSTEM_PROMPT
    });

    return parseAndValidatePostJson(regenResult.data, topic);
  }
}
