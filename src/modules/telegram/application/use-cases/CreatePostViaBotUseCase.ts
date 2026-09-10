import type { IPostRepository } from "../../../content/domain/repositories/IPostRepository.ts";
import type { IAiServiceWithHistory } from "../../../ai-copilot/domain/services/IAiService.ts";
import { CreatePostUseCase } from "../../../content/application/use-cases/CreatePostUseCase.ts";

export interface CreatePostViaBotParams {
  /** Тема / описание поста от пользователя */
  topic: string;
  /** Выбранная в сессии модель */
  modelId: string;
  /** Дополнительный контекст (авторский Tone of Voice) */
  toneGuidance?: string;
}

export interface CreatePostViaBotResult {
  postId: string;
  hookText: string;
  bodyText: string;
  modelLabel: string;
}

const POST_SYSTEM_PROMPT = `Ты профессиональный копирайтер для X (Twitter).
Твоя задача — написать виральный пост для X.
Формат ответа — строго JSON (никаких markdown-блоков вокруг):
{
  "hook": "<цепляющий первый твит / заголовок, до 280 символов>",
  "body": "<основной текст поста, 1-5 абзацев>"
}
Пиши живо, конкретно, без воды.`;

/**
 * Use case: создать пост через Telegram-бота.
 *
 * Алгоритм:
 * 1. Генерировать hook + body через AI (JSON-ответ)
 * 2. Создать Post в D1 со статусом DRAFT
 * 3. Вернуть ID и текст для отображения в боте
 */
export class CreatePostViaBotUseCase {
  private readonly createPostUseCase: CreatePostUseCase;

  constructor(
    private readonly postRepo: IPostRepository,
    private readonly aiService: IAiServiceWithHistory
  ) {
    this.createPostUseCase = new CreatePostUseCase(postRepo);
  }

  public async execute(params: CreatePostViaBotParams): Promise<CreatePostViaBotResult> {
    const { topic, modelId, toneGuidance } = params;

    // 1. Генерация через AI
    const systemPrompt = toneGuidance
      ? `${POST_SYSTEM_PROMPT}\n\nTone of Voice: ${toneGuidance}`
      : POST_SYSTEM_PROMPT;

    const aiResult = await this.aiService.chatWithHistory({
      messages: [{ role: "user", content: `Напиши пост на тему: "${topic}"` }],
      modelId,
      systemPrompt
    });

    // 2. Парсинг JSON ответа
    const { hook, body } = this.parseAiPostJson(aiResult.data, topic);

    // 3. Создать Post в D1 (initialHook + initialBody создаются внутри CreatePostUseCase)
    const createResult = await this.createPostUseCase.execute({
      notes: topic,
      tags: ["telegram-bot"],
      initialHook: hook,
      initialBody: body
    });

    if (createResult.isFailure) {
      throw new Error(`Не удалось создать пост: ${createResult.getError()}`);
    }

    const postDto = createResult.getValue();

    return {
      postId: postDto.id,
      hookText: hook,
      bodyText: body,
      modelLabel: aiResult.meta.label
    };
  }

  private parseAiPostJson(
    raw: string,
    fallbackTopic: string
  ): { hook: string; body: string } {
    // Пытаемся извлечь JSON из ответа (модель может обернуть в ```)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.hook && parsed.body) {
          return {
            hook: String(parsed.hook).slice(0, 280),
            body: String(parsed.body)
          };
        }
      } catch {
        // fall through
      }
    }

    // Fallback: весь ответ = body, тема = hook
    return {
      hook: `🚀 ${fallbackTopic}`.slice(0, 280),
      body: raw.trim()
    };
  }
}
