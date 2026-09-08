import { IPlaybookRepository } from "../../modules/playbook/domain/repositories/IPlaybookRepository.ts";
import {
  GetPlaybookUseCase,
  SaveMethodologyUseCase,
  SaveToneProfileUseCase
} from "../../modules/playbook/application/use-cases/GetPlaybookUseCase.ts";

export class PlaybookController {
  private readonly getPlaybookUseCase: GetPlaybookUseCase;
  private readonly saveMethodologyUseCase: SaveMethodologyUseCase;
  private readonly saveToneProfileUseCase: SaveToneProfileUseCase;

  constructor(private readonly repo: IPlaybookRepository) {
    this.getPlaybookUseCase = new GetPlaybookUseCase(repo);
    this.saveMethodologyUseCase = new SaveMethodologyUseCase(repo);
    this.saveToneProfileUseCase = new SaveToneProfileUseCase(repo);
  }

  public async getPlaybook() {
    const res = await this.getPlaybookUseCase.execute();
    return res.getValue();
  }

  public async saveMethodology(data: any) {
    const res = await this.saveMethodologyUseCase.execute(data);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async deleteMethodology(id: string) {
    await this.repo.deleteMethodology(id);
    return { success: true };
  }

  public async saveToneProfile(data: any) {
    const res = await this.saveToneProfileUseCase.execute(data);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }
}
