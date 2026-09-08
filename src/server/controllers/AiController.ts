import { IAiService, AiGenerationMeta, CritiqueResult } from "../../modules/ai-copilot/domain/services/IAiService.ts";
import { IPlaybookRepository } from "../../modules/playbook/domain/repositories/IPlaybookRepository.ts";
import {
  GenerateHooksUseCase,
  PolishPostUseCase,
  CritiquePostUseCase,
  ExpandToThreadUseCase
} from "../../modules/ai-copilot/application/AiCopilotUseCases.ts";

export class AiController {
  private readonly aiService: IAiService;
  private readonly generateHooksUseCase: GenerateHooksUseCase;
  private readonly polishPostUseCase: PolishPostUseCase;
  private readonly critiquePostUseCase: CritiquePostUseCase;
  private readonly expandToThreadUseCase: ExpandToThreadUseCase;

  constructor(aiService: IAiService, playbookRepo: IPlaybookRepository) {
    this.aiService = aiService;
    this.generateHooksUseCase = new GenerateHooksUseCase(aiService, playbookRepo);
    this.polishPostUseCase = new PolishPostUseCase(aiService, playbookRepo);
    this.critiquePostUseCase = new CritiquePostUseCase(aiService, playbookRepo);
    this.expandToThreadUseCase = new ExpandToThreadUseCase(aiService, playbookRepo);
  }

  public async generateHooks(text: string, count: number = 3) {
    const res = await this.generateHooksUseCase.execute(text, count);
    if (res.isFailure) throw new Error(res.getError());
    const { data, meta } = res.getValue();
    return { hooks: data, meta };
  }

  public async polish(text: string, instructions: string) {
    const res = await this.polishPostUseCase.execute(text, instructions);
    if (res.isFailure) throw new Error(res.getError());
    const { data, meta } = res.getValue();
    return { result: data, meta };
  }

  public async critique(text: string) {
    const res = await this.critiquePostUseCase.execute(text);
    if (res.isFailure) throw new Error(res.getError());
    const { data, meta } = res.getValue();
    return { ...data, meta };
  }

  public async expandToThread(text: string) {
    const res = await this.expandToThreadUseCase.execute(text);
    if (res.isFailure) throw new Error(res.getError());
    const { data, meta } = res.getValue();
    return { tweets: data, meta };
  }

  public async testConnection() {
    return await this.aiService.testConnection();
  }
}

export type { AiGenerationMeta, CritiqueResult };
