import type { TelegramKvStore } from "../infrastructure/TelegramKvStore.ts";
import type { TelegramApiClient } from "../infrastructure/TelegramApiClient.ts";
import type { ChatWithAiUseCase } from "./use-cases/ChatWithAiUseCase.ts";
import type { CreatePostViaBotUseCase } from "./use-cases/CreatePostViaBotUseCase.ts";
import type { FindPostViaBotUseCase } from "./use-cases/FindPostViaBotUseCase.ts";
import { listSelectableModels, type AiModel } from "../../ai-copilot/domain/aiModels.ts";

// ─── Telegram Update Types ──────────────────────────────────────────────────

export type TgUser = {
  id: number;
  first_name: string;
  username?: string;
};

export type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
  voice?: { file_id: string; duration: number };
};

export type TgCallbackQuery = {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
};

export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

// ─── Router Context ──────────────────────────────────────────────────────────

export interface BotContext {
  kvStore: TelegramKvStore;
  tgApi: TelegramApiClient;
  chatWithAi: ChatWithAiUseCase;
  createPost: CreatePostViaBotUseCase;
  findPost: FindPostViaBotUseCase;
  /** ID из TELEGRAM_ALLOWED_IDS (null = открытый доступ) */
  allowedUserIds: number[] | null;
}

// ─── Router ──────────────────────────────────────────────────────────────────

/**
 * Маршрутизатор Telegram-апдейтов.
 *
 * Команды:
 *   /start            — приветствие
 *   /model | /models  — выбор AI-модели (inline keyboard)
 *   /newchat          — очистить историю
 *   /post <тема>      — создать пост
 *   /find <запрос>    — найти посты
 *   <любой текст>     — чат с ИИ
 *   callback_query    — обработка выбора модели
 */
export class BotCommandRouter {
  constructor(private readonly ctx: BotContext) {}

  public async handle(update: TgUpdate): Promise<void> {
    try {
      if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
        return;
      }

      const msg = update.message;
      if (!msg) return;

      // Проверка доступа
      if (!this.isAllowed(msg.from?.id)) {
        await this.ctx.tgApi.sendMessage(
          msg.chat.id,
          "❌ У тебя нет доступа к этому боту."
        );
        return;
      }

      const text = msg.text?.trim() || "";
      const chatId = msg.chat.id;

      if (text.startsWith("/start")) {
        await this.handleStart(chatId, msg.from);
      } else if (text.startsWith("/model") || text.startsWith("/models")) {
        await this.handleModelSelect(chatId);
      } else if (text.startsWith("/newchat")) {
        await this.handleNewChat(chatId);
      } else if (text.startsWith("/post")) {
        const topic = text.replace(/^\/post\s*/i, "").trim();
        await this.handleCreatePost(chatId, topic);
      } else if (text.startsWith("/find")) {
        const query = text.replace(/^\/find\s*/i, "").trim();
        await this.handleFindPost(chatId, query);
      } else if (text.startsWith("/")) {
        await this.ctx.tgApi.sendMessage(
          chatId,
          "❓ Неизвестная команда. Напиши /start чтобы увидеть список команд."
        );
      } else if (text) {
        await this.handleChat(chatId, text);
      }
    } catch (err: any) {
      console.error("[BotCommandRouter] Unhandled error:", err);
    }
  }

  // ─── Command Handlers ────────────────────────────────────────────────────

  private async handleStart(chatId: number, user?: TgUser): Promise<void> {
    const name = user?.first_name || "друг";
    await this.ctx.tgApi.sendMessage(
      chatId,
      `👋 Привет, *${escMd(name)}*\\! Я *X\\-Manager Bot* — твой AI\\-ассистент для создания контента\\.\n\n` +
      `*Команды:*\n` +
      `🤖 /model — выбрать AI\\-модель\n` +
      `🔄 /newchat — начать новый чат\n` +
      `✍️ /post \\<тема\\> — создать пост для X\n` +
      `🔍 /find \\<запрос\\> — найти пост в базе\n\n` +
      `Или просто напиши мне — и я отвечу\\! 💬`,
      { parse_mode: "MarkdownV2" }
    );

    // Регистрируем команды для меню кнопки "/"
    await this.ctx.tgApi.setMyCommands([
      { command: "start", description: "Приветствие и список команд" },
      { command: "model", description: "Выбрать AI-модель" },
      { command: "newchat", description: "Начать новый чат" },
      { command: "post", description: "Создать пост (тема через пробел)" },
      { command: "find", description: "Найти пост (запрос через пробел)" }
    ]);
  }

  private async handleModelSelect(chatId: number): Promise<void> {
    const models = listSelectableModels();
    const session = await this.ctx.kvStore.getSession(chatId);

    // Разбиваем на строки по 2 кнопки
    const buttons = models.map((m: AiModel) => ({
      text: (m.id === session.modelId ? "✅ " : "") + m.label,
      callback_data: `model:${m.id}`
    }));

    const keyboard: Array<typeof buttons> = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }

    await this.ctx.tgApi.sendMessage(
      chatId,
      `🤖 *Выбери AI\\-модель:*\n_Сейчас активна: ${escMd(session.modelId)}_`,
      {
        parse_mode: "MarkdownV2",
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  }

  private async handleNewChat(chatId: number): Promise<void> {
    await this.ctx.kvStore.clearHistory(chatId);
    await this.ctx.tgApi.sendMessage(
      chatId,
      "🔄 История чата очищена\\. Начинаем с чистого листа\\! 🆕",
      { parse_mode: "MarkdownV2" }
    );
  }

  private async handleCreatePost(chatId: number, topic: string): Promise<void> {
    if (!topic) {
      await this.ctx.tgApi.sendMessage(
        chatId,
        "✍️ Укажи тему поста после команды:\n`/post Почему founders должны писать каждый день`",
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    await this.ctx.tgApi.sendTyping(chatId);
    await this.ctx.tgApi.sendMessage(
      chatId,
      `✍️ Генерирую пост на тему *${escMd(topic)}*\\.\\.\\.`,
      { parse_mode: "MarkdownV2" }
    );

    try {
      const session = await this.ctx.kvStore.getSession(chatId);
      const result = await this.ctx.createPost.execute({
        topic,
        modelId: session.modelId
      });

      const lines = [
        `📝 *Пост создан\\!*`,
        ``,
        `*Хук:*`,
        escMd(result.hookText),
        ``,
        `*Текст:*`,
        escMd(result.bodyText),
        ``,
        `🆔 \`${result.postId}\``,
        `🤖 _${escMd(result.modelLabel)}_`,
        ``,
        `✅ Сохранён в базе X\\-Manager как DRAFT\\.`
      ];

      await this.ctx.tgApi.sendMessage(chatId, lines.join("\n"), {
        parse_mode: "MarkdownV2"
      });
    } catch (err: any) {
      console.error("[Bot] createPost error:", err);
      await this.ctx.tgApi.sendMessage(
        chatId,
        `❌ Ошибка при создании поста: ${escMd(err.message || "Неизвестная ошибка")}`,
        { parse_mode: "MarkdownV2" }
      );
    }
  }

  private async handleFindPost(chatId: number, query: string): Promise<void> {
    if (!query) {
      await this.ctx.tgApi.sendMessage(
        chatId,
        "🔍 Укажи поисковый запрос после команды:\n`/find контент-маркетинг`",
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    await this.ctx.tgApi.sendTyping(chatId);

    try {
      const result = await this.ctx.findPost.execute({ query });
      await this.ctx.tgApi.sendMessage(chatId, result.telegramText, {
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true
      });
    } catch (err: any) {
      console.error("[Bot] findPost error:", err);
      await this.ctx.tgApi.sendMessage(
        chatId,
        `❌ Ошибка поиска: ${escMd(err.message || "Неизвестная ошибка")}`,
        { parse_mode: "MarkdownV2" }
      );
    }
  }

  private async handleChat(chatId: number, text: string): Promise<void> {
    await this.ctx.tgApi.sendTyping(chatId);

    try {
      const session = await this.ctx.kvStore.getSession(chatId);
      const result = await this.ctx.chatWithAi.execute({
        chatId,
        userText: text,
        modelId: session.modelId
      });

      // Отправляем ответ как обычный текст (не MarkdownV2) — AI может вернуть что угодно
      await this.ctx.tgApi.sendMessage(chatId, result.reply);
    } catch (err: any) {
      console.error("[Bot] chat error:", err);
      await this.ctx.tgApi.sendMessage(
        chatId,
        `❌ Ошибка: ${err.message || "Не удалось получить ответ от AI"}`
      );
    }
  }

  // ─── Callback Query ─────────────────────────────────────────────────────

  private async handleCallbackQuery(cq: TgCallbackQuery): Promise<void> {
    const chatId = cq.message?.chat.id;
    if (!chatId) return;

    if (!this.isAllowed(cq.from.id)) {
      await this.ctx.tgApi.answerCallbackQuery(cq.id, "❌ Нет доступа");
      return;
    }

    const data = cq.data || "";

    if (data.startsWith("model:")) {
      const modelId = data.replace("model:", "");
      const models = listSelectableModels();
      const model = models.find((m: AiModel) => m.id === modelId);

      if (!model) {
        await this.ctx.tgApi.answerCallbackQuery(cq.id, "❌ Модель не найдена");
        return;
      }

      await this.ctx.kvStore.setModel(chatId, modelId);
      await this.ctx.tgApi.answerCallbackQuery(cq.id, `✅ ${model.label}`);
      await this.ctx.tgApi.sendMessage(
        chatId,
        `✅ Выбрана модель: *${escMd(model.label)}*`,
        { parse_mode: "MarkdownV2" }
      );
    }
  }

  // ─── Access Control ─────────────────────────────────────────────────────

  private isAllowed(userId?: number): boolean {
    if (!userId) return false;
    if (!this.ctx.allowedUserIds) return true; // открытый доступ
    return this.ctx.allowedUserIds.includes(userId);
  }
}

/** Экранирование для MarkdownV2 */
function escMd(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
