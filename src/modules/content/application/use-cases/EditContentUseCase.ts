import type { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { PostMapper, type PostDto } from "../dtos/PostDto.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { ContentAiGenerator } from "../services/ContentAiGenerator.ts";

export interface EditContentRequest {
  postId: string;
  instruction: string;
  modelId?: string;
}

export interface EditContentResponse {
  post: PostDto;
  updatedHook: string;
  updatedBody: string;
}

export class EditContentUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly aiGenerator: ContentAiGenerator
  ) {}

  public async execute(req: EditContentRequest): Promise<Result<EditContentResponse>> {
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail("Активный пост не найден. Возможно, он был удалён.");
    }

    const activeHook = post.getActiveHook();
    const activeBody = post.getActiveBody();
    const currentText = `${activeHook?.text || ""}\n\n${activeBody?.text || ""}`.trim();

    const { hook: newHook, body: newBody } = await this.aiGenerator.editContent({
      currentText,
      instruction: req.instruction,
      modelId: req.modelId
    });

    // TODO: Will become immutable version creation in next versioning migration.
    // Currently mutating active hook/body until PostVersion entity is introduced.
    if (activeHook) {
      post.updateHook(activeHook.id, newHook);
    }
    if (activeBody) {
      post.updateBody(activeBody.id, newBody);
    }

    await this.postRepository.save(post);

    return Result.ok({
      post: PostMapper.toDto(post),
      updatedHook: newHook,
      updatedBody: newBody
    });
  }
}
