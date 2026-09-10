import type { IAiServiceWithHistory } from "../../ai-copilot/domain/services/IAiService.ts";
import type { ConversationContext } from "../domain/ChatSession.ts";
import type { ParsedIntent } from "../domain/ConversationIntent.ts";

// ─── System Prompt ────────────────────────────────────────────────────────────

const INTENT_SYSTEM_PROMPT = `Ты — Intent Router для Telegram-бота управления контентом.
Твоя задача: определить намерение пользователя и вернуть СТРОГО JSON (никаких markdown-блоков, никакого текста вокруг).

Доступные actions:
- content.create   — создать пост/варианты (пользователь просит написать/создать/сделай N постов)
- content.edit     — редактировать активный вариант (инструкция по изменению)
- content.regenerate — перегенерировать активный вариант заново
- content.select_variant — выбрать один из предложенных вариантов (по номеру)
- content.show     — показать текущий активный контент
- content.find     — найти/найди посты по запросу
- content.schedule — запланировать публикацию
- content.publish  — опубликовать сейчас
- chat             — обычный вопрос, не связанный с созданием контента

Формат ответа — ТОЛЬКО JSON:

Для content.create:
{"action":"content.create","parameters":{"topic":"<тема>","variants":<число>,"tone":["<тональность>"],"constraints":[]}}

Для content.edit:
{"action":"content.edit","parameters":{"instruction":"<инструкция>"}}

Для content.regenerate:
{"action":"content.regenerate","parameters":{"instruction":"<опционально>"}}

Для content.select_variant:
{"action":"content.select_variant","parameters":{"variantNumber":<число от 1>}}

Для content.show:
{"action":"content.show","parameters":{}}

Для content.find:
{"action":"content.find","parameters":{"query":"<запрос>"}}

Для content.schedule:
{"action":"content.schedule","parameters":{"datetime":"<дата/время>"}}

Для content.publish:
{"action":"content.publish","parameters":{}}

Для chat:
{"action":"chat","parameters":{"message":"<оригинальное сообщение пользователя>"}}

Правила:
- "variants" по умолчанию = 1 если пользователь не уточнил количество
- "tone" — список из: expert, provocative, storytelling, funny, inspirational, analytical (выбирай по контексту, пустой массив если не указано)
- Числительные в тексте ("первый", "второй", "третий", "пятый") конвертируй в цифры для variantNumber
- Если контекст (context) указан — учитывай его при разрешении неоднозначностей
- НИКОГДА не добавляй текст до или после JSON`;

// ─── Runtime Guards (не доверяем LLM без проверки) ───────────────────────────

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && isFinite(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

type RawIntent = { action?: unknown; parameters?: unknown };

function validateParsedIntent(raw: RawIntent): ParsedIntent | null {
  const action = raw.action;
  const params = (raw.parameters || {}) as Record<string, unknown>;

  switch (action) {
    case "content.create": {
      const topic = isString(params.topic) ? params.topic : "";
      if (!topic) return null;
      const variants = isNumber(params.variants) && params.variants >= 1
        ? Math.min(Math.round(params.variants), 10)
        : 1;
      const tone = isStringArray(params.tone) ? params.tone : [];
      const constraints = isStringArray(params.constraints) ? params.constraints : [];
      return { action: "content.create", parameters: { topic, variants, tone, constraints } };
    }

    case "content.edit": {
      const instruction = isString(params.instruction) ? params.instruction : "";
      if (!instruction) return null;
      return { action: "content.edit", parameters: { instruction } };
    }

    case "content.regenerate": {
      const instruction = isString(params.instruction) ? params.instruction : undefined;
      return { action: "content.regenerate", parameters: { instruction } };
    }

    case "content.select_variant": {
      const num = isNumber(params.variantNumber) ? Math.round(params.variantNumber) : 0;
      if (num < 1) return null;
      return { action: "content.select_variant", parameters: { variantNumber: num } };
    }

    case "content.show":
      return { action: "content.show", parameters: {} };

    case "content.find": {
      const query = isString(params.query) ? params.query : "";
      if (!query) return null;
      return { action: "content.find", parameters: { query } };
    }

    case "content.schedule": {
      const datetime = isString(params.datetime) ? params.datetime : "";
      return { action: "content.schedule", parameters: { datetime } };
    }

    case "content.publish":
      return { action: "content.publish", parameters: {} };

    case "chat": {
      const message = isString(params.message) ? params.message : "";
      return { action: "chat", parameters: { message } };
    }

    default:
      return null;
  }
}

function extractJson(raw: string): RawIntent | null {
  // Пробуем извлечь JSON из ответа (модель может обернуть в ``` или добавить текст)
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as RawIntent;
  } catch {
    return null;
  }
}

// ─── IntentParser ─────────────────────────────────────────────────────────────

export class IntentParser {
  constructor(private readonly aiService: IAiServiceWithHistory) {}

  /**
   * Парсим intent из пользовательского сообщения.
   * При любой ошибке — fallback на { action: 'chat' }.
   */
  public async parse(
    userText: string,
    context: ConversationContext,
    modelId: string
  ): Promise<ParsedIntent> {
    try {
      // Добавляем контекст в user-промпт чтобы LLM мог разрешать неоднозначности
      const contextHint = this.buildContextHint(context);
      const userPrompt = contextHint
        ? `Контекст: ${contextHint}\n\nСообщение пользователя: ${userText}`
        : `Сообщение пользователя: ${userText}`;

      const result = await this.aiService.chatWithHistory({
        messages: [{ role: "user", content: userPrompt }],
        modelId,
        systemPrompt: INTENT_SYSTEM_PROMPT
      });

      const raw = extractJson(result.data);
      if (!raw) {
        console.warn("[IntentParser] No JSON found in AI response:", result.data.slice(0, 200));
        return this.chatFallback(userText);
      }

      const intent = validateParsedIntent(raw);
      if (!intent) {
        console.warn("[IntentParser] Invalid intent shape:", JSON.stringify(raw).slice(0, 200));
        return this.chatFallback(userText);
      }

      return intent;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[IntentParser] Error:", msg);
      return this.chatFallback(userText);
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private chatFallback(userText: string): ParsedIntent {
    return { action: "chat", parameters: { message: userText } };
  }

  private buildContextHint(ctx: ConversationContext): string {
    const parts: string[] = [];
    if (ctx.postId) parts.push(`активный пост: ${ctx.postId}`);
    if (ctx.variantId) parts.push(`активный вариант: ${ctx.variantId}`);
    if (ctx.versionId) parts.push(`активная версия: ${ctx.versionId}`);
    if (ctx.intent) parts.push(`предыдущий intent: ${ctx.intent}`);
    return parts.join(", ");
  }
}
