export interface CritiqueResult {
  score: number; // 1-10
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  suggestedRewrite: string;
}

/** Кто реально ответил на запрос копилота. */
export type AiGenerationMeta = {
  providerId: string;
  modelId: string;
  label: string;
  source: "llm" | "local";
};

export type AiResult<T> = {
  data: T;
  meta: AiGenerationMeta;
};

export interface IAiService {
  generateHooks(params: {
    text: string;
    toneGuidance?: string;
    count?: number;
  }): Promise<AiResult<string[]>>;

  polishContent(params: {
    text: string;
    instructions: string;
    toneGuidance?: string;
  }): Promise<AiResult<string>>;

  critiqueContent(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<AiResult<CritiqueResult>>;

  expandToThread(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<AiResult<string[]>>;

  testConnection(): Promise<{ success: boolean; model?: string; error?: string }>;
}
