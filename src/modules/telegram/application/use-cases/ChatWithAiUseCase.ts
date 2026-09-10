import type { TelegramKvStore } from "../../infrastructure/TelegramKvStore.ts";
import type { IAiServiceWithHistory } from "../../../ai-copilot/domain/services/IAiService.ts";
import type { ChatMessage } from "../../domain/ChatSession.ts";

export interface ChatWithAiParams {
  chatId: number;
  userText: string;
  /** ID выбранной модели (из сессии) */
  modelId: string;
}

export interface ChatWithAiResult {
  reply: string;
  modelLabel: string;
}

/**
 * Use case: продолжение диалога с AI с сохранением истории.
 *
 * Алгоритм:
 * 1. Загрузить историю из KV
 * 2. Добавить сообщение пользователя
 * 3. Отправить полную историю в AI (multi-turn)
 * 4. Добавить ответ AI в историю
 * 5. Сохранить обновлённую историю в KV
 */
export class ChatWithAiUseCase {
  constructor(
    private readonly kvStore: TelegramKvStore,
    private readonly aiService: IAiServiceWithHistory
  ) {}

  public async execute(params: ChatWithAiParams): Promise<ChatWithAiResult> {
    const { chatId, userText, modelId } = params;

    // 1. Загрузить историю
    const history = await this.kvStore.getHistory(chatId);

    // 2. Добавить сообщение пользователя
    const userMsg: ChatMessage = { role: "user", content: userText };
    const updatedHistory = await this.kvStore.appendMessage(chatId, userMsg);

    // 3. Отправить в AI с полной историей
    const result = await this.aiService.chatWithHistory({
      messages: updatedHistory,
      modelId
    });

    // 4. Добавить ответ AI в историю
    const assistantMsg: ChatMessage = { role: "assistant", content: result.data };
    await this.kvStore.appendMessage(chatId, assistantMsg);

    return {
      reply: result.data,
      modelLabel: result.meta.label
    };
  }
}
