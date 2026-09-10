import type { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { PostMapper, type PostDto } from "../dtos/PostDto.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { ContentAiGenerator } from "../services/ContentAiGenerator.ts";

export interface RegenerateContentRequest {
  postId: string;
  variantId?: string;
  instruction?: string;
  modelId?: string;
}

export interface RegenerateContentResponse {
  post: PostDto;
  postId: string;
  variantId: string;
  versionId: string;
  versionNumber: number;
  hook: string;
  body: string;
}

export class RegenerateContentUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly aiGenerator: ContentAiGenerator
  ) {}

  public async execute(req: RegenerateContentRequest): Promise<Result<RegenerateContentResponse>> {
    // 1. Load Post
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail("Активный пост не найден.");
    }

    // 2. Load target / active Variant
    const targetVariantId = req.variantId || post.activeVariantId;
    const variant = targetVariantId ? post.getVariantById(targetVariantId) : post.getActiveVariant();

    if (!variant) {
      return Result.fail("Активный вариант не найден.");
    }

    const topic = post.notes || variant.hook || "контент";

    // 3. Generate new content via AI
    const { hook, body } = await this.aiGenerator.regenerateContent({
      topic,
      instruction: req.instruction,
      modelId: req.modelId
    });

    // 4. Create new Version on the variant without mutating/deleting previous versions
    const versionRes = variant.addVersion(
      hook,
      body,
      req.instruction ? `regenerate: ${req.instruction}` : "regenerate"
    );

    if (versionRes.isFailure) {
      return Result.fail(versionRes.getError());
    }

    const newVersion = versionRes.getValue();

    // Ensure variant is active on post
    post.selectVariant(variant.id);

    await this.postRepository.save(post);

    return Result.ok({
      post: PostMapper.toDto(post),
      postId: post.id,
      variantId: variant.id,
      versionId: newVersion.id,
      versionNumber: newVersion.versionNumber,
      hook: newVersion.hook,
      body: newVersion.body
    });
  }
}
