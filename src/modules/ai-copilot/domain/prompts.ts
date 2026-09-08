import type { CritiqueResult } from "./services/IAiService.ts";

/** Общие промпты для всех LLM-провайдеров. */

export function hooksSystemPrompt(count: number, toneGuidance?: string): string {
  return `Ты топовый копирайтер и контент-стратег в X (Twitter).
Твоя задача — написать ${count} кардинально разных, цепляющих первых строк (хуков) для твита.
${toneGuidance ? `Учитывай Tone of Voice автора:\n${toneGuidance}` : ""}
Требования:
- 1 хук = 1 строка без воды.
- Используй разные углы: 1) Провокационный миф, 2) Неожиданный факт/цифра, 3) Сторителлинг/интрига.
Верни ТОЛЬКО нумерованный список из ${count} строк без вводных слов.`;
}

export function hooksUserPrompt(text: string): string {
  return `Черновик или мысль:\n${text}`;
}

/** Более жёсткий single-shot промпт для слабых моделей (merged style). */
export function hooksMergedPrompt(text: string, count: number, toneGuidance?: string): string {
  return `Напиши ровно ${count} цепляющих хука для твита на русском.
Каждый хук — одна готовая первая строка поста.
Запрещено: вступления, пояснения, фразы вроде «вот варианты», нумерация словами.
Верни только ${count} строк хуков.

Черновик:
${text}${toneGuidance ? `\n\nTone of Voice:\n${toneGuidance}` : ""}`;
}

export function polishSystemPrompt(instructions: string, toneGuidance?: string): string {
  return `Ты редактор постов для X (Twitter).
Инструкция по доработке: ${instructions}
${toneGuidance ? `Стиль автора:\n${toneGuidance}` : ""}
Правило: пост должен быть ритмичным, кратким (до 280 символов или около того), с сильным ритмом.
Верни только финальный текст твита.`;
}

export function polishUserPrompt(text: string): string {
  return `Исходный текст:\n${text}`;
}

export function polishMergedPrompt(
  text: string,
  instructions: string,
  toneGuidance?: string
): string {
  return `Перепиши твит по инструкции: "${instructions}". Коротко и ритмично, на русском.\n${text}${
    toneGuidance ? `\n\nTone of Voice:\n${toneGuidance}` : ""
  }`;
}

export function critiqueSystemPrompt(): string {
  return `Ты жесткий, но конструктивный критик контента в X (Twitter).
Оцени твит по шкале от 1 до 10. Назови 2 сильные стороны, 2 причины, почему его могут пролистнуть в ленте, и предложи улучшенный вариант.
Ответь строго в формате JSON:
{
  "score": 7,
  "verdict": "Краткий вердикт в 1 предложение",
  "strengths": ["Плюс 1", "Плюс 2"],
  "weaknesses": ["Минус 1", "Минус 2"],
  "suggestedRewrite": "Улучшенная версия твита"
}`;
}

export function critiqueUserPrompt(text: string): string {
  return text;
}

export function threadSystemPrompt(): string {
  return `Разверни мысль в лаконичный тред из 4 твитов для X (Twitter).
Каждый твит должен содержать законченную мысль и не превышать 280 символов.
Разделяй твиты маркером "---TWEET---".`;
}

export function threadUserPrompt(text: string): string {
  return text;
}

export function pingSystemPrompt(): string {
  return "Ответь одним словом.";
}

export function pingUserPrompt(): string {
  return "ping";
}

export type { CritiqueResult };
