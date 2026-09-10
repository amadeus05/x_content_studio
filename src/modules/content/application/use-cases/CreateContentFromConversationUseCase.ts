import type { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { CreatePostUseCase } from "./CreatePostUseCase.ts";
import { PostMapper, type PostDto } from "../dtos/PostDto.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { ContentAiGenerator, type GeneratedPostContent } from "../services/ContentAiGenerator.ts";

export interface CreateContentFromConversationRequest {
  topic: string;
  variants: number;
  tone: string[];
  constraints: string[];
  modelId?: string;
}

export interface CreateContentFromConversationResponse {
  post: PostDto;
  topic: string;
  variants: GeneratedPostContent[];
  activeVariantId: string;
  activeVersionId: string;
}

export class CreateContentFromConversationUseCase {
  private readonly createPostUseCase: CreatePostUseCase;

  constructor(
    private readonly postRepository: IPostRepository,
    private readonly aiGenerator: ContentAiGenerator,
    createPostUseCase?: CreatePostUseCase
  ) {
    this.createPostUseCase = createPostUseCase ?? new CreatePostUseCase(postRepository);
  }

  public async execute(
    req: CreateContentFromConversationRequest
  ): Promise<Result<CreateContentFromConversationResponse>> {
    const { topic, variants, tone, modelId } = req;
    const count = Math.max(1, Math.min(variants || 1, 10));

    // 1. Generate N variants via AI
    const successful = await this.aiGenerator.generateVariants({
      topic,
      tone,
      count,
      modelId
    });

    if (successful.length === 0) {
      return Result.fail("Не удалось сгенерировать контент. Попробуй ещё раз.");
    }

    // 2. Reuse existing CreatePostUseCase to create the Post with the first variant
    const first = successful[0];
    const createResult = await this.createPostUseCase.execute({
      notes: topic,
      tags: ["telegram-bot", "conversational"],
      initialHook: first.hook,
      initialBody: first.body
    });

    if (createResult.isFailure) {
      return Result.fail(`Ошибка создания поста: ${createResult.getError()}`);
    }

    const initialDto = createResult.getValue();
    const post = await this.postRepository.findById(initialDto.id);
    if (!post) {
      return Result.fail("Пост создан, но не найден при загрузке.");
    }

    // 3. For each additional GeneratedPostContent: create PostVariant with Version 1
    for (let i = 1; i < successful.length; i++) {
      const v = successful[i];
      post.addVariant(v.hook, v.body, `Вариант ${i + 1}`, "created");
    }

    // 4. Make first variant active
    const firstVariant = post.getVariants()[0];
    if (firstVariant) {
      post.selectVariant(firstVariant.id);
      // 5. Version 1 of the first variant is active
      const v1 = firstVariant.getVersions()[0];
      if (v1) {
        firstVariant.selectVersion(v1.id);
      }
    }

    await this.postRepository.save(post);

    const postDto = PostMapper.toDto(post);
    const activeVar = post.getActiveVariant();
    const activeVer = activeVar?.getActiveVersion();

    return Result.ok({
      post: postDto,
      topic,
      variants: successful,
      activeVariantId: activeVar?.id || "",
      activeVersionId: activeVer?.id || ""
    });
  }
}
