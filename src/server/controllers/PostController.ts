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
