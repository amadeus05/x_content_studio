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

    // 1. Generate variants via AI
    const successful = await this.aiGenerator.generateVariants({
      topic,
      tone,
      count,
      modelId
    });

    if (successful.length === 0) {
      return Result.fail("Не удалось сгенерировать контент. Попробуй ещё раз.");
    }

    // 2. Reuse existing CreatePostUseCase to create the post with the first variant
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

    // 3. Add remaining variants as additional hooks & bodies on the post
    for (let i = 1; i < successful.length; i++) {
      const v = successful[i];
      post.addHook(v.hook, `Вариант ${i + 1}`);
      post.addBody(v.body, `Вариант ${i + 1}`);
    }

    await this.postRepository.save(post);

    return Result.ok({
      post: PostMapper.toDto(post),
      topic,
      variants: successful
    });
  }
}
