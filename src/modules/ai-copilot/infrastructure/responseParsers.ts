import type { CritiqueResult } from "../domain/services/IAiService.ts";

const META_HOOK_LINE =
  /^(вот|here are|here is|ниже|варианты|хуки|вариант|твит|набросок|список)\b/i;

export function parseHookList(raw: string, count: number): string[] {
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
      // Отсекаем служебные заголовки («Вот хуки:»), но не виральные хуки с «:» в конце
      if (line.endsWith(":") && META_HOOK_LINE.test(line)) return false;
      if (META_HOOK_LINE.test(line) && line.length < 40) return false;
      if (/хук(ов|а|и)? для твита/i.test(line)) return false;
      if (/на русском\s*:?\s*$/i.test(line)) return false;
      return true;
    })
    .slice(0, count);
}

function extractJsonObject(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "")).filter(Boolean);
}

export function parseCritiqueJson(raw: string): CritiqueResult | null {
  try {
    const json = extractJsonObject(raw);
    if (!json) return null;
    const data = JSON.parse(json) as Record<string, unknown>;

    const scoreRaw = data.score ?? data.rating;
    const score = typeof scoreRaw === "number" ? scoreRaw : Number(scoreRaw);
    if (!Number.isFinite(score)) return null;

    const strengths = asStringArray(data.strengths);
    const weaknesses = asStringArray(data.weaknesses);
    const verdict = String(data.verdict ?? "").trim();
    const suggestedRewrite = String(data.suggestedRewrite ?? data.suggested_rewrite ?? "").trim();

    if (!verdict || strengths.length === 0 || weaknesses.length === 0 || !suggestedRewrite) {
      return null;
    }

    return {
      score: Math.min(10, Math.max(1, Math.round(score))),
      verdict,
      strengths,
      weaknesses,
      suggestedRewrite
    };
  } catch {
    return null;
  }
}

export function parseThread(raw: string): string[] {
  return raw
    .split("---TWEET---")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
