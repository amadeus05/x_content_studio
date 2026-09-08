import { IAiService, CritiqueResult } from "../domain/services/IAiService.ts";

const GEMINI_PRIMARY_MODEL = "gemini-3.8-flash";
const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";
const CLOUDFLARE_AI_MODELS = [
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct-fast"
];

export interface AiServiceConfig {
  cloudflareAi?: any; // Cloudflare env.AI binding
  geminiApiKey?: string;
}

export class HybridAiService implements IAiService {
  constructor(private readonly config: AiServiceConfig = {}) { }

  public async generateHooks(params: {
    text: string;
    toneGuidance?: string;
    count?: number;
  }): Promise<string[]> {
    const count = params.count || 3;

    if (this.config.geminiApiKey) {
      try {
        return await this.callGeminiHooks(params.text, params.toneGuidance, count);
      } catch {
        // дальше Cloudflare / локальный движок
      }
    }

    if (this.config.cloudflareAi) {
      try {
        return await this.callCloudflareAiHooks(params.text, params.toneGuidance, count);
      } catch {
        // локальный fallback
      }
    }

    return this.generateSmartLocalHooks(params.text, count);
  }

  public async polishContent(params: {
    text: string;
    instructions: string;
    toneGuidance?: string;
  }): Promise<string> {
    if (this.config.geminiApiKey) {
      try {
        return await this.callGeminiPolish(params.text, params.instructions, params.toneGuidance);
      } catch {
        // дальше Cloudflare / локальный движок
      }
    }

    if (this.config.cloudflareAi) {
      try {
        return await this.callCloudflareAiPolish(params.text, params.instructions, params.toneGuidance);
      } catch {
        // локальный fallback
      }
    }

    return this.generateSmartLocalPolish(params.text, params.instructions);
  }

  public async critiqueContent(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<CritiqueResult> {
    if (this.config.geminiApiKey) {
      return this.callGeminiCritique(params.text, params.toneGuidance);
    }

    return this.generateSmartLocalCritique(params.text);
  }

  public async expandToThread(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<string[]> {
    if (this.config.geminiApiKey) {
      return this.callGeminiThread(params.text, params.toneGuidance);
    }

    return this.generateSmartLocalThread(params.text);
  }

  public async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> {
    if (!this.config.geminiApiKey) {
      return { success: false, error: "Нет Gemini API ключа" };
    }
    try {
      const text = await this.callGemini("Ответь одним словом.", "ping");
      return { success: Boolean(text), model: GEMINI_PRIMARY_MODEL };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --- Вспомогательные методы для Google Gemini API ---
  private async callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      return await this.callGeminiModel(GEMINI_PRIMARY_MODEL, systemPrompt, userPrompt);
    } catch {
      return this.callGeminiModel(GEMINI_FALLBACK_MODEL, systemPrompt, userPrompt);
    }
  }

  private async callGeminiModel(
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.geminiApiKey}`;
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
    const text = this.extractGeminiText(data);
    if (!text) {
      throw new Error(`Gemini API Error (${model}): empty response`);
    }
    return text;
  }

  private extractGeminiText(data: any): string {
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    return parts
      .filter((part: { text?: string; thought?: boolean }) => part.text && !part.thought)
      .map((part: { text: string }) => part.text)
      .join("")
      .trim();
  }

  private async callGeminiHooks(text: string, tone?: string, count: number = 3): Promise<string[]> {
    const system = `Ты топовый копирайтер и контент-стратег в X (Twitter).
Твоя задача — написать ${count} кардинально разных, цепляющих первых строк (хуков) для твита.
${tone ? `Учитывай Tone of Voice автора:\n${tone}` : ""}
Требования:
- 1 хук = 1 строка без воды.
- Используй разные углы: 1) Провокационный миф, 2) Неожиданный факт/цифра, 3) Сторителлинг/интрига.
Верни ТОЛЬКО нумерованный список из ${count} строк без вводных слов.`;

    const res = await this.callGemini(system, `Черновик или мысль:\n${text}`);
    return this.parseHookList(res, count);
  }

  private async callGeminiPolish(text: string, instructions: string, tone?: string): Promise<string> {
    const system = `Ты редактор постов для X (Twitter).
Инструкция по доработке: ${instructions}
${tone ? `Стиль автора:\n${tone}` : ""}
Правило: пост должен быть ритмичным, кратким (до 280 символов или около того), с сильным ритмом.
Верни только финальный текст твита.`;

    return (await this.callGemini(system, `Исходный текст:\n${text}`)).trim();
  }

  private async callGeminiCritique(text: string, tone?: string): Promise<CritiqueResult> {
    const system = `Ты жесткий, но конструктивный критик контента в X (Twitter).
Оцени твит по шкале от 1 до 10. Назови 2 сильные стороны, 2 причины, почему его могут пролистнуть в ленте, и предложи улучшенный вариант.
Ответь строго в формате JSON:
{
  "score": 7,
  "verdict": "Краткий вердикт в 1 предложение",
  "strengths": ["Плюс 1", "Плюс 2"],
  "weaknesses": ["Минус 1", "Минус 2"],
  "suggestedRewrite": "Улучшенная версия твита"
}`;

    const raw = await this.callGemini(system, text);
    try {
      const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return this.generateSmartLocalCritique(text);
    }
  }

  private async callGeminiThread(text: string, tone?: string): Promise<string[]> {
    const system = `Разверни мысль в лаконичный тред из 4 твитов для X (Twitter).
Каждый твит должен содержать законченную мысль и не превышать 280 символов.
Разделяй твиты маркером "---TWEET---".`;

    const raw = await this.callGemini(system, text);
    return raw
      .split("---TWEET---")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  // --- Cloudflare Workers AI ---
  private async runCloudflareAi(prompt: string): Promise<string> {
    if (!this.config.cloudflareAi) {
      throw new Error("Cloudflare AI binding is missing");
    }

    let lastError: unknown;
    for (const model of CLOUDFLARE_AI_MODELS) {
      try {
        const result: any = await this.config.cloudflareAi.run(model, {
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

  private parseHookList(raw: string, count: number): string[] {
    return raw
      .split("\n")
      .map((line) =>
        line
          .replace(/^[\s>*#-]+/, "")
          .replace(/^\d+[\.\)\:]\s*/, "")
          .replace(/^["«]+|["»]+$/g, "")
          .trim()
      )
      .filter((line) => {
        if (!line || line.length < 8) return false;
        if (line.endsWith(":") && line.length < 90) return false;
        if (/^(вот|here are|here is|ниже|варианты|хуки)\b/i.test(line)) return false;
        if (/хук(ов|а|и)? для твита/i.test(line)) return false;
        if (/на русском\s*:?\s*$/i.test(line)) return false;
        return true;
      })
      .slice(0, count);
  }

  private async callCloudflareAiHooks(text: string, tone?: string, count: number = 3): Promise<string[]> {
    const prompt = `Напиши ровно ${count} цепляющих хука для твита на русском.
Каждый хук — одна готовая первая строка поста.
Запрещено: вступления, пояснения, фразы вроде «вот варианты», нумерация словами.
Верни только ${count} строк хуков.

Черновик:
${text}${tone ? `\n\nTone of Voice:\n${tone}` : ""}`;
    const output = await this.runCloudflareAi(prompt);
    return this.parseHookList(output, count);
  }

  private async callCloudflareAiPolish(text: string, instructions: string, tone?: string): Promise<string> {
    const prompt = `Перепиши твит по инструкции: "${instructions}". Коротко и ритмично, на русском.\n${text}${tone ? `\n\nTone of Voice:\n${tone}` : ""}`;
    return (await this.runCloudflareAi(prompt)).trim() || text;
  }

  // --- Локальный движок (работает без API ключей) ---
  private generateSmartLocalHooks(text: string, count: number): string[] {
    const clean = text.split("\n")[0].replace(/^["']|["']$/g, "").trim();
    const topic = clean.length > 50 ? clean.slice(0, 50) + "..." : clean;

    const templates = [
      `95% людей ошибаются насчет ${topic || "этого"}. Вот неочевидная правда:`,
      `Я потратил месяцы на изучение темы, чтобы вы поняли главное за 2 минуты:`,
      `Худший совет, который вам могут дать: «Просто делайте ${topic || "это"} как все».`,
      `Секрет виральности в 2025 году сводится всего к 1 простому правилу:`,
      `Если бы мне пришлось начать с нуля, я бы сделал только эти 3 вещи:`
    ];

    return templates.slice(0, count);
  }

  private generateSmartLocalPolish(text: string, instructions: string): string {
    const cleanLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (instructions.toLowerCase().includes("punch") || instructions.toLowerCase().includes("сокр")) {
      return cleanLines
        .map((l) => (l.length > 70 ? l.split(". ")[0] + "." : l))
        .join("\n\n");
    }

    return `${cleanLines.join("\n\n")}\n\nЧто думаете по этому поводу? 👇`;
  }

  private generateSmartLocalCritique(text: string): CritiqueResult {
    const length = text.length;
    const hasNumbers = /\d/.test(text);
    const hasQuestion = /\?/.test(text);

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (length < 240) strengths.push("Оптимальная длина: легко читается с мобильного экрана.");
    else weaknesses.push("Текст близок к лимиту или длинный: стоит разбить на короткие абзацы.");

    if (hasNumbers) strengths.push("Наличие конкретики/цифр усиливает доверие.");
    else weaknesses.push("Не хватает конкретных цифр или примеров для убедительности.");

    if (!hasQuestion) weaknesses.push("Нет вовлекающего триггера в конце для комментариев.");
    else strengths.push("Хороший открытый вопрос для вовлечения аудитории.");

    const score = Math.min(10, Math.max(5, 7 + (hasNumbers ? 1 : -1) + (hasQuestion ? 1 : 0)));

    return {
      score,
      verdict: score >= 8 ? "Сильный твит с хорошим потенциалом вовлечения." : "Неплохая мысль, но нужно усилить первый хук.",
      strengths,
      weaknesses,
      suggestedRewrite: `${text.split("\n")[0]}\n\n(Усиленная мысль с четкими пунктами)`
    };
  }

  private generateSmartLocalThread(text: string): string[] {
    return [
      `1/4 ${text.split("\n")[0] || "Главный инсайт дня:"}`,
      `2/4 Шаг 1: Сначала определяем узкое горлышко проблемы. Большинство пропускают этот этап.`,
      `3/4 Шаг 2: Внедряем быстрое решение без усложнений. Главное — скорость цикла обратной связи.`,
      `4/4 Итог: Если было полезно, сделайте репост и сохраните в закладки 🔖`
    ];
  }
}
