import type { TelegramKvStore } from "../infrastructure/TelegramKvStore.ts";
import type { TelegramApiClient } from "../infrastructure/TelegramApiClient.ts";
import type { IAiServiceWithHistory } from "../../ai-copilot/domain/services/IAiService.ts";
import type { IPostRepository } from "../../content/domain/repositories/IPostRepository.ts";
import { IntentParser } from "./IntentParser.ts";
import { ActionExecutor } from "./ActionExecutor.ts";
import { ChatWithAiUseCase } from "./use-cases/ChatWithAiUseCase.ts";

// ─── Deps ──────────────────────────────────────────────────────────────────────

export interface OrchestratorDeps {
  kvStore: TelegramKvStore;
  tgApi: TelegramApiClient;
  aiService: IAiServiceWithHistory;
  postRepo: IPostRepository;
}

// ─── ConversationOrchestrator ──────────────────────────────────────────────────

/**
 * Центральный оркестратор conversational flow.
 *
 * Pipeline:
 *   text message
 *     ↓
 *   getSession() → ConversationContext + modelId
 *     ↓
 *   IntentParser.parse(text, context)
 *     ↓
 *   ActionExecutor.execute(intent, context) | ChatWithAiUseCase (fallback)
 *     ↓
 *   updateContext() + send reply
 */
export class ConversationOrchestrator {
  private readonly intentParser: IntentParser;
  private readonly actionExecutor: ActionExecutor;
  private readonly chatWithAi: ChatWithAiUseCase;

  constructor(private readonly deps: OrchestratorDeps) {
    this.intentParser = new IntentParser(deps.aiService);
    this.actionExecutor = new ActionExecutor({
      postRepo: deps.postRepo,
      aiService: deps.aiService
    });
    this.chatWithAi = new ChatWithAiUseCase(deps.kvStore, deps.aiService);
  }

  /**
   * Обрабатывает текстовое сообщение пользователя.
   * Возвращает текст ответа.
   */
  public async handle(chatId: number, userText: string): Promise<string> {
    // 1. Загружаем сессию (modelId + context)
    const session = await this.deps.kvStore.getSession(chatId);
    const { modelId, context } = session;

    // 2. Парсим intent через AI
    let intent;
    try {
      intent = await this.intentParser.parse(userText, context, modelId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Orchestrator] IntentParser failed:", msg);
      // При сбое парсера — обычный чат
      return this.runChat(chatId, userText, modelId);
    }

    console.log(`[Orchestrator] chatId=${chatId} action=${intent.action}`);

    // 3. Если action=chat — делегируем в ChatWithAiUseCase (сохраняет историю)
    if (intent.action === "chat") {
      return this.runChat(chatId, userText, modelId);
    }

    // 4. Выполняем action
    let result;
    try {
      result = await this.actionExecutor.execute(intent, context, modelId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Orchestrator] ActionExecutor failed:", msg);
      return `❌ Ошибка выполнения: ${msg}`;
    }

    // 5. Обновляем контекст если нужно
    if (result.contextUpdate && Object.keys(result.contextUpdate).length > 0) {
      await this.deps.kvStore.updateContext(chatId, {
        ...result.contextUpdate,
        intent: intent.action
      });
    } else {
      // Даже без contextUpdate — запоминаем последний intent
      await this.deps.kvStore.updateContext(chatId, { intent: intent.action });
    }

    return result.reply;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async runChat(chatId: number, userText: string, modelId: string): Promise<string> {
    try {
      const result = await this.chatWithAi.execute({ chatId, userText, modelId });
      return result.reply;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Orchestrator] ChatWithAi failed:", msg);
      return `❌ Ошибка: ${msg || "Не удалось получить ответ от AI"}`;
    }
  }
}
