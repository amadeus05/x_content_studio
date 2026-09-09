import { IPostRepository } from "../../modules/content/domain/repositories/IPostRepository.ts";
import { CreatePostUseCase } from "../../modules/content/application/use-cases/CreatePostUseCase.ts";
import { UpdatePostContentUseCase } from "../../modules/content/application/use-cases/UpdatePostContentUseCase.ts";
import { ChangePostStatusUseCase } from "../../modules/content/application/use-cases/ChangePostStatusUseCase.ts";
import {
  AddPostVariantUseCase,
  SelectActiveVariantUseCase,
  DeletePostVariantUseCase
} from "../../modules/content/application/use-cases/AddPostVariantUseCase.ts";
import {
  AddPostHookUseCase,
  SelectPostHookUseCase,
  UpdatePostHookUseCase,
  DeletePostHookUseCase,
  PinBodyToHookUseCase
} from "../../modules/content/application/use-cases/PostHookUseCases.ts";
import {
  AddPostBodyUseCase,
  SelectPostBodyUseCase,
  UpdatePostBodyUseCase,
  DeletePostBodyUseCase
} from "../../modules/content/application/use-cases/PostBodyUseCases.ts";
import {
  SearchPostsUseCase,
  GetPostByIdUseCase,
  DeletePostUseCase,
  GetAllTagsUseCase
} from "../../modules/content/application/use-cases/SearchPostsUseCase.ts";

export class PostController {
  private readonly createPostUseCase: CreatePostUseCase;
  private readonly updatePostUseCase: UpdatePostContentUseCase;
  private readonly changeStatusUseCase: ChangePostStatusUseCase;
  private readonly addVariantUseCase: AddPostVariantUseCase;
  private readonly selectVariantUseCase: SelectActiveVariantUseCase;
  private readonly deleteVariantUseCase: DeletePostVariantUseCase;
  private readonly searchPostsUseCase: SearchPostsUseCase;
  private readonly getPostByIdUseCase: GetPostByIdUseCase;
  private readonly deletePostUseCase: DeletePostUseCase;
  private readonly getAllTagsUseCase: GetAllTagsUseCase;

  private readonly addHookUseCase: AddPostHookUseCase;
  private readonly selectHookUseCase: SelectPostHookUseCase;
  private readonly updateHookUseCase: UpdatePostHookUseCase;
  private readonly deleteHookUseCase: DeletePostHookUseCase;
  private readonly pinBodyUseCase: PinBodyToHookUseCase;

  private readonly addBodyUseCase: AddPostBodyUseCase;
  private readonly selectBodyUseCase: SelectPostBodyUseCase;
  private readonly updateBodyUseCase: UpdatePostBodyUseCase;
  private readonly deleteBodyUseCase: DeletePostBodyUseCase;

  constructor(repo: IPostRepository) {
    this.createPostUseCase = new CreatePostUseCase(repo);
    this.updatePostUseCase = new UpdatePostContentUseCase(repo);
    this.changeStatusUseCase = new ChangePostStatusUseCase(repo);
    this.addVariantUseCase = new AddPostVariantUseCase(repo);
    this.selectVariantUseCase = new SelectActiveVariantUseCase(repo);
    this.deleteVariantUseCase = new DeletePostVariantUseCase(repo);
    this.searchPostsUseCase = new SearchPostsUseCase(repo);
    this.getPostByIdUseCase = new GetPostByIdUseCase(repo);
    this.deletePostUseCase = new DeletePostUseCase(repo);
    this.getAllTagsUseCase = new GetAllTagsUseCase(repo);

    this.addHookUseCase = new AddPostHookUseCase(repo);
    this.selectHookUseCase = new SelectPostHookUseCase(repo);
    this.updateHookUseCase = new UpdatePostHookUseCase(repo);
    this.deleteHookUseCase = new DeletePostHookUseCase(repo);
    this.pinBodyUseCase = new PinBodyToHookUseCase(repo);

    this.addBodyUseCase = new AddPostBodyUseCase(repo);
    this.selectBodyUseCase = new SelectPostBodyUseCase(repo);
    this.updateBodyUseCase = new UpdatePostBodyUseCase(repo);
    this.deleteBodyUseCase = new DeletePostBodyUseCase(repo);
  }

  public async getPosts(query: { status?: string; search?: string; tag?: string }) {
    const res = await this.searchPostsUseCase.execute(query);
    return res.getValue();
  }

  public async getPost(id: string) {
    const res = await this.getPostByIdUseCase.execute(id);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async createPost(body: any) {
    const res = await this.createPostUseCase.execute(body);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async updatePost(id: string, body: any) {
    const res = await this.updatePostUseCase.execute({ postId: id, ...body });
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async changeStatus(id: string, status: string) {
    const res = await this.changeStatusUseCase.execute({ postId: id, status });
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  // === Hooks ===

  public async addHook(id: string, body: any) {
    const res = await this.addHookUseCase.execute({ postId: id, ...body });
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async selectHook(id: string, hookId: string) {
    const res = await this.selectHookUseCase.execute(id, hookId);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async updateHook(id: string, hookId: string, body: any) {
    const res = await this.updateHookUseCase.execute(id, hookId, body);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async deleteHook(id: string, hookId: string) {
    const res = await this.deleteHookUseCase.execute(id, hookId);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async pinBodyToHook(id: string, hookId: string, bodyId: string | null) {
    const res = await this.pinBodyUseCase.execute(id, hookId, bodyId);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  // === Bodies ===

  public async addBody(id: string, body: any) {
    const res = await this.addBodyUseCase.execute({ postId: id, ...body });
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async selectBody(id: string, bodyId: string) {
    const res = await this.selectBodyUseCase.execute(id, bodyId);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async updateBody(id: string, bodyId: string, body: any) {
    const res = await this.updateBodyUseCase.execute(id, bodyId, body);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async deleteBody(id: string, bodyId: string) {
    const res = await this.deleteBodyUseCase.execute(id, bodyId);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  // === Legacy Variants API ===

  public async addVariant(id: string, body: any) {
    const res = await this.addVariantUseCase.execute({ postId: id, ...body });
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async selectVariant(id: string, variantId: string) {
    const res = await this.selectVariantUseCase.execute(id, variantId);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async deleteVariant(id: string, variantId: string) {
    const res = await this.deleteVariantUseCase.execute(id, variantId);
    if (res.isFailure) throw new Error(res.getError());
    return res.getValue();
  }

  public async deletePost(id: string) {
    const res = await this.deletePostUseCase.execute(id);
    if (res.isFailure) throw new Error(res.getError());
    return { success: true };
  }

  public async getTags() {
    const res = await this.getAllTagsUseCase.execute();
    return res.getValue();
  }
}
