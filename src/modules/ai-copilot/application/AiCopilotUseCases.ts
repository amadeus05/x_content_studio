import { IAiService, CritiqueResult, AiResult } from "../domain/services/IAiService.ts";
import { IPlaybookRepository } from "../../playbook/domain/repositories/IPlaybookRepository.ts";
import { Result } from "../../../shared/domain/Result.ts";

export class GenerateHooksUseCase {
  constructor(
    private readonly aiService: IAiService,
    private readonly playbookRepository: IPlaybookRepository
  ) {}

  public async execute(text: string, count: number = 3): Promise<Result<AiResult<string[]>>> {
    try {
      const toneProfile = await this.playbookRepository.getToneProfile();
      const guidance = toneProfile.toSystemPromptGuidance();
      const result = await this.aiService.generateHooks({
        text,
        toneGuidance: guidance,
        count
      });
      return Result.ok(result);
    } catch (err: any) {
      return Result.fail(`Ошибка генерации хуков: ${err.message || String(err)}`);
    }
  }
}

export class PolishPostUseCase {
  constructor(
    private readonly aiService: IAiService,
    private readonly playbookRepository: IPlaybookRepository
  ) {}

  public async execute(text: string, instructions: string): Promise<Result<AiResult<string>>> {
    try {
      const toneProfile = await this.playbookRepository.getToneProfile();
      const guidance = toneProfile.toSystemPromptGuidance();
      const result = await this.aiService.polishContent({
        text,
        instructions,
        toneGuidance: guidance
      });
      return Result.ok(result);
    } catch (err: any) {
      return Result.fail(`Ошибка улучшения текста: ${err.message || String(err)}`);
    }
  }
}

export class CritiquePostUseCase {
  constructor(
    private readonly aiService: IAiService,
    private readonly playbookRepository: IPlaybookRepository
  ) {}

  public async execute(text: string): Promise<Result<AiResult<CritiqueResult>>> {
    try {
      const toneProfile = await this.playbookRepository.getToneProfile();
      const guidance = toneProfile.toSystemPromptGuidance();
      const result = await this.aiService.critiqueContent({
        text,
        toneGuidance: guidance
      });
      return Result.ok(result);
    } catch (err: any) {
      return Result.fail(`Ошибка анализа поста: ${err.message || String(err)}`);
    }
  }
}

export class ExpandToThreadUseCase {
  constructor(
    private readonly aiService: IAiService,
    private readonly playbookRepository: IPlaybookRepository
  ) {}

  public async execute(text: string): Promise<Result<AiResult<string[]>>> {
    try {
      const toneProfile = await this.playbookRepository.getToneProfile();
      const guidance = toneProfile.toSystemPromptGuidance();
      const result = await this.aiService.expandToThread({
        text,
        toneGuidance: guidance
      });
      return Result.ok(result);
    } catch (err: any) {
      return Result.fail(`Ошибка разворота в тред: ${err.message || String(err)}`);
    }
  }
}
