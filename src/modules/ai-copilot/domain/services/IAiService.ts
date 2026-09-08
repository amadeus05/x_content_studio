export interface CritiqueResult {
  score: number; // 1-10
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  suggestedRewrite: string;
}

export interface IAiService {
  generateHooks(params: {
    text: string;
    toneGuidance?: string;
    count?: number;
  }): Promise<string[]>;

  polishContent(params: {
    text: string;
    instructions: string;
    toneGuidance?: string;
  }): Promise<string>;

  critiqueContent(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<CritiqueResult>;

  expandToThread(params: {
    text: string;
    toneGuidance?: string;
  }): Promise<string[]>;

  testConnection(): Promise<{ success: boolean; model?: string; error?: string }>;
}
