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
  selectedHook: string;
  selectedBody: string;
  activeHookId: string;
  activeBodyId?: string;
}

export class SelectVariantUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(req: SelectVariantRequest): Promise<Result<SelectVariantResponse>> {
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail("Активный пост не найден.");
    }

    // Always validate against the real Post domain model, not trust external context hints
    const hooks = post.hooks.slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const bodies = post.bodies.slice().sort((a, b) => a.orderIndex - b.orderIndex);

    if (req.variantNumber < 1 || req.variantNumber > hooks.length) {
      return Result.fail(
        `Вариант ${req.variantNumber} не существует. Доступно: ${hooks.length} вариантов.`
      );
    }

    const targetHook = hooks[req.variantNumber - 1];
    const targetBody = bodies[req.variantNumber - 1];

    if (!targetHook) {
      return Result.fail(`Вариант ${req.variantNumber} не найден.`);
    }

    post.selectHook(targetHook.id);
    if (targetBody) {
      post.selectBody(targetBody.id);
    }

    await this.postRepository.save(post);

    return Result.ok({
      post: PostMapper.toDto(post),
      variantNumber: req.variantNumber,
      selectedHook: targetHook.text,
      selectedBody: targetBody?.text || "",
      activeHookId: targetHook.id,
      activeBodyId: targetBody?.id
    });
  }
}
