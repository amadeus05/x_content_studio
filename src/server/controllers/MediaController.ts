import { IMediaRepository } from "../../modules/media/domain/repositories/IMediaRepository.ts";
import { IObjectStorage } from "../../modules/media/infrastructure/IObjectStorage.ts";
import {
  UploadMediaUseCase,
  ListMediaUseCase,
  DeleteMediaUseCase,
  SetPrimaryMediaUseCase,
  DeleteOwnerMediaUseCase
} from "../../modules/media/application/MediaUseCases.ts";

export class MediaController {
  private readonly uploadUseCase: UploadMediaUseCase;
  private readonly listUseCase: ListMediaUseCase;
  private readonly deleteUseCase: DeleteMediaUseCase;
  private readonly setPrimaryUseCase: SetPrimaryMediaUseCase;
  private readonly deleteOwnerUseCase: DeleteOwnerMediaUseCase;

  constructor(
    private readonly repo: IMediaRepository,
    private readonly storage: IObjectStorage
  ) {
    this.uploadUseCase = new UploadMediaUseCase(repo, storage);
    this.listUseCase = new ListMediaUseCase(repo);
    this.deleteUseCase = new DeleteMediaUseCase(repo, storage);
    this.setPrimaryUseCase = new SetPrimaryMediaUseCase(repo);
    this.deleteOwnerUseCase = new DeleteOwnerMediaUseCase(repo, storage);
  }

  public async list(modelType: string, modelId: string) {
    const res = await this.listUseCase.execute(modelType, modelId);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async upload(params: {
    modelType: string;
    modelId: string;
    filename: string;
    mimeType: string;
    data: ArrayBuffer;
    altText?: string;
  }) {
    const res = await this.uploadUseCase.execute(params);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async delete(id: string) {
    const res = await this.deleteUseCase.execute(id);
    if (res.isFailure) throw new Error(res.getError());
    return { success: true };
  }

  public async deleteOwner(modelType: string, modelId: string) {
    const res = await this.deleteOwnerUseCase.execute(modelType, modelId);
    if (res.isFailure) throw new Error(res.getError());
    return { success: true };
  }

  public async setPrimary(id: string) {
    const res = await this.setPrimaryUseCase.execute(id);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async getFile(id: string) {
    const asset = await this.repo.findById(id);
    if (!asset) return null;
    const obj = await this.storage.get(asset.storageKey);
    if (!obj) return null;
    return { body: obj.body, mimeType: obj.mimeType || asset.mimeType, filename: asset.filename };
  }
}
