import type { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { PostMapper, type PostDto } from "../dtos/PostDto.ts";
import { Result } from "../../../../shared/domain/Result.ts";

export interface SelectVariantRequest {
  postId: string;
  variantNumber: number;
}

export interface SelectVariantResponse {
  post: PostDto;
  variantNumber: number;
  variantId: string;
  versionId: string;
  selectedHook: string;
  selectedBody: string;
  hook: string;
  body: string;
}

export class SelectVariantUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(req: SelectVariantRequest): Promise<Result<SelectVariantResponse>> {
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail("Активный пост не найден.");
    }

    // Work strictly with PostVariant collection
    const variants = post.getVariants();

    if (req.variantNumber < 1 || req.variantNumber > variants.length) {
      return Result.fail(
        `Вариант ${req.variantNumber} не существует. Доступно: ${variants.length} вариантов.`
      );
    }

    const targetVariant = variants[req.variantNumber - 1];
    if (!targetVariant) {
      return Result.fail(`Вариант ${req.variantNumber} не найден.`);
    }

    // Select the variant on the post
    post.selectVariant(targetVariant.id);

    // Its active version becomes the current version
    const activeVersion = targetVariant.getActiveVersion();
    const versionId = activeVersion?.id || targetVariant.activeVersionId;
    const hook = activeVersion?.hook || targetVariant.hook;
    const body = activeVersion?.body || targetVariant.body;

    await this.postRepository.save(post);

    return Result.ok({
      post: PostMapper.toDto(post),
      variantNumber: req.variantNumber,
      variantId: targetVariant.id,
      versionId,
      selectedHook: hook,
      selectedBody: body,
      hook,
      body
    });
  }
}
