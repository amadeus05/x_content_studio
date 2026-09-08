import { IPlaybookRepository } from "../../domain/repositories/IPlaybookRepository.ts";
import { Methodology } from "../../domain/entities/Methodology.ts";
import { ToneProfile } from "../../domain/entities/ToneProfile.ts";
import { Result } from "../../../../shared/domain/Result.ts";

export interface MethodologyDto {
  id: string;
  name: string;
  category: string;
  description: string;
  formula: string;
  templateExample: string;
  createdAt: string;
}

export interface ToneProfileDto {
  id: string;
  name: string;
  rules: string[];
  avoidWords: string[];
  targetAudience: string;
}

export class PlaybookMapper {
  public static toMethodologyDto(m: Methodology): MethodologyDto {
    return {
      id: m.id,
      name: m.name,
      category: m.category,
      description: m.description,
      formula: m.formula,
      templateExample: m.templateExample,
      createdAt: m.createdAt.toISOString()
    };
  }

  public static toToneProfileDto(tp: ToneProfile): ToneProfileDto {
    return {
      id: tp.id,
      name: tp.name,
      rules: tp.rules,
      avoidWords: tp.avoidWords,
      targetAudience: tp.targetAudience
    };
  }
}

export class GetPlaybookUseCase {
  constructor(private readonly playbookRepository: IPlaybookRepository) {}

  public async execute(): Promise<Result<{ methodologies: MethodologyDto[]; toneProfile: ToneProfileDto }>> {
    const methodologies = await this.playbookRepository.getAllMethodologies();
    const toneProfile = await this.playbookRepository.getToneProfile();

    return Result.ok({
      methodologies: methodologies.map(PlaybookMapper.toMethodologyDto),
      toneProfile: PlaybookMapper.toToneProfileDto(toneProfile)
    });
  }
}

export class SaveMethodologyUseCase {
  constructor(private readonly playbookRepository: IPlaybookRepository) {}

  public async execute(data: {
    id?: string;
    name: string;
    category: string;
    description: string;
    formula: string;
    templateExample: string;
  }): Promise<Result<MethodologyDto>> {
    const methRes = Methodology.create(data, data.id);
    if (methRes.isFailure) {
      return Result.fail(methRes.getError());
    }

    const meth = methRes.getValue();
    await this.playbookRepository.saveMethodology(meth);

    return Result.ok(PlaybookMapper.toMethodologyDto(meth));
  }
}

export class SaveToneProfileUseCase {
  constructor(private readonly playbookRepository: IPlaybookRepository) {}

  public async execute(data: {
    rules: string[];
    avoidWords: string[];
    targetAudience: string;
  }): Promise<Result<ToneProfileDto>> {
    const profile = await this.playbookRepository.getToneProfile();
    profile.update(data.rules, data.avoidWords, data.targetAudience);
    await this.playbookRepository.saveToneProfile(profile);

    return Result.ok(PlaybookMapper.toToneProfileDto(profile));
  }
}
