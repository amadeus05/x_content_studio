export const GEMINI_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" }
] as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[number]["id"];

export const GEMINI_PRIMARY_MODEL: GeminiModelId = "gemini-3.8-flash";
export const GEMINI_FALLBACK_MODEL: GeminiModelId = "gemini-3.5-flash";

export function resolveGeminiModel(value?: string | null): GeminiModelId {
  return GEMINI_MODELS.some((m) => m.id === value) ? (value as GeminiModelId) : GEMINI_PRIMARY_MODEL;
}
