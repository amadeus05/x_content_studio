import type { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { PostMapper, type PostDto } from "../dtos/PostDto.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { ContentAiGenerator } from "../services/ContentAiGenerator.ts";

export interface EditContentRequest {
  postId: string;
  variantId?: string;
  instruction: string;
  modelId?: string;
}

export interface EditContentResponse {
  post: PostDto;
  postId: string;
  variantId: string;
  versionId: string;
  versionNumber: number;
  hook: string;
  body: string;
  updatedHook: string;
  updatedBody: string;
}

export class EditContentUseCase {
  constructor(
    private readonly postRepository: IPostRepository,
    private readonly aiGenerator: ContentAiGenerator
  ) {}

  public async execute(req: EditContentRequest): Promise<Result<EditContentResponse>> {
    // 1. Load Post
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail("Активный пост не найден. Возможно, он был удалён.");
    }

    // 2. Load target / active Variant
    const targetVariantId = req.variantId || post.activeVariantId;
    const variant = targetVariantId ? post.getVariantById(targetVariantId) : post.getActiveVariant();

    if (!variant) {
      return Result.fail("Активный вариант не найден.");
    }

    // 3. Load active Version
    const activeVersion = variant.getActiveVersion();
    const currentText = activeVersion ? activeVersion.getFullText() : variant.getFullText();

    // 4. Pass current hook/body + instruction to AI
    const { hook: newHook, body: newBody } = await this.aiGenerator.editContent({
      currentText,
      instruction: req.instruction,
      modelId: req.modelId
    });

    // 5. Create NEW PostVersion (versionNumber auto-incremented, old version untouched, new version becomes active)
    const versionRes = variant.addVersion(newHook, newBody, `edit: ${req.instruction}`);
    if (versionRes.isFailure) {
      return Result.fail(versionRes.getError());
    }

    const newVersion = versionRes.getValue();

    // Ensure variant remains active on the post
    post.selectVariant(variant.id);

    // Save to repository
    await this.postRepository.save(post);

    return Result.ok({
      post: PostMapper.toDto(post),
      postId: post.id,
      variantId: variant.id,
      versionId: newVersion.id,
      versionNumber: newVersion.versionNumber,
      hook: newVersion.hook,
      body: newVersion.body,
      updatedHook: newVersion.hook,
      updatedBody: newVersion.body
    });
  }
}
