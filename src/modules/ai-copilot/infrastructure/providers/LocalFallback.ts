import type { CritiqueResult } from "../../domain/services/IAiService.ts";

/** Офлайн-эвристики без API. Не LLM-провайдер. */
export class LocalFallback {
  generateHooks(text: string, count: number): string[] {
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

  polish(text: string, instructions: string): string {
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

  critique(text: string): CritiqueResult {
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
      verdict:
        score >= 8
          ? "Сильный твит с хорошим потенциалом вовлечения."
          : "Неплохая мысль, но нужно усилить первый хук.",
      strengths,
      weaknesses,
      suggestedRewrite: `${text.split("\n")[0]}\n\n(Усиленная мысль с четкими пунктами)`
    };
  }

  expandThread(text: string): string[] {
    return [
      `1/4 ${text.split("\n")[0] || "Главный инсайт дня:"}`,
      `2/4 Шаг 1: Сначала определяем узкое горлышко проблемы. Большинство пропускают этот этап.`,
      `3/4 Шаг 2: Внедряем быстрое решение без усложнений. Главное — скорость цикла обратной связи.`,
      `4/4 Итог: Если было полезно, сделайте репост и сохраните в закладки 🔖`
    ];
  }
}
