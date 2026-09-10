import type { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { PostMapper, type PostDto } from "../dtos/PostDto.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { ContentAiGenerator } from "../services/ContentAiGenerator.ts";

export interface RegenerateContentRequest {
  postId: string;
  instruction?: string;
  modelId?: string;
}

export interface RegenerateContentResponse {
  post: PostDto;
  hook: string;
  body: string;
}

export class RegenerateContentUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly aiGenerator: ContentAiGenerator
  ) {}

  public async execute(req: RegenerateContentRequest): Promise<Result<RegenerateContentResponse>> {
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail("Активный пост не найден.");
    }

    const topic = post.notes || "контент";

    const { hook, body } = await this.aiGenerator.regenerateContent({
      topic,
      instruction: req.instruction,
      modelId: req.modelId
    });

    const activeHook = post.getActiveHook();
    const activeBody = post.getActiveBody();

    // TODO: Will become immutable version creation in next versioning migration.
    // Currently mutating active hook/body until PostVersion entity is introduced.
    if (activeHook) {
      post.updateHook(activeHook.id, hook);
    }
    if (activeBody) {
      post.updateBody(activeBody.id, body);
    }

    await this.postRepository.save(post);

    return Result.ok({
      post: PostMapper.toDto(post),
      hook,
      body
    });
  }
}
