import { IAiService, CritiqueResult } from "../domain/services/IAiService.ts";
import { IPlaybookRepository } from "../../playbook/domain/repositories/IPlaybookRepository.ts";
import { Result } from "../../../shared/domain/Result.ts";

export class GenerateHooksUseCase {
  constructor(
    private readonly aiService: IAiService,
    private readonly playbookRepository: IPlaybookRepository
  ) {}

  public async execute(text: string, count: number = 3): Promise<Result<string[]>> {
    try {
      const toneProfile = await this.playbookRepository.getToneProfile();
      const guidance = toneProfile.toSystemPromptGuidance();
      const hooks = await this.aiService.generateHooks({
        text,
        toneGuidance: guidance,
        count
      });
      return Result.ok(hooks);
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

  public async execute(text: string, instructions: string): Promise<Result<string>> {
    try {
      const toneProfile = await this.playbookRepository.getToneProfile();
      const guidance = toneProfile.toSystemPromptGuidance();
      const polished = await this.aiService.polishContent({
        text,
        instructions,
        toneGuidance: guidance
      });
      return Result.ok(polished);
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

  public async execute(text: string): Promise<Result<CritiqueResult>> {
    try {
      const toneProfile = await this.playbookRepository.getToneProfile();
      const guidance = toneProfile.toSystemPromptGuidance();
      const critique = await this.aiService.critiqueContent({
        text,
        toneGuidance: guidance
      });
      return Result.ok(critique);
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

  public async execute(text: string): Promise<Result<string[]>> {
    try {
      const toneProfile = await this.playbookRepository.getToneProfile();
      const guidance = toneProfile.toSystemPromptGuidance();
      const tweets = await this.aiService.expandToThread({
        text,
        toneGuidance: guidance
      });
      return Result.ok(tweets);
    } catch (err: any) {
      return Result.fail(`Ошибка разворота в тред: ${err.message || String(err)}`);
    }
  }
}
