/** Telegram InlineKeyboardButton */
export type TgInlineButton = {
  text: string;
  callback_data: string;
};

/** Опции для sendMessage */
export type SendMessageOptions = {
  parse_mode?: "MarkdownV2" | "HTML" | "Markdown";
  reply_markup?: {
    inline_keyboard?: TgInlineButton[][];
    remove_keyboard?: boolean;
  };
  disable_web_page_preview?: boolean;
};

/**
 * Тонкая обёртка над Telegram Bot API.
 * Используем только нужные для MVP методы.
 */
export class TelegramApiClient {
  private readonly baseUrl: string;

  constructor(private readonly botToken: string) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /** Отправить текстовое сообщение */
  public async sendMessage(
    chatId: number,
    text: string,
    options: SendMessageOptions = {}
  ): Promise<void> {
    await this.call("sendMessage", {
      chat_id: chatId,
      text,
      ...options
    });
  }

  /** Показать "печатает..." индикатор */
  public async sendTyping(chatId: number): Promise<void> {
    await this.call("sendChatAction", {
      chat_id: chatId,
      action: "typing"
    });
  }

  /** Ответить на callback_query (убрать spinner на кнопке) */
  public async answerCallbackQuery(
    callbackQueryId: string,
    text?: string
  ): Promise<void> {
    await this.call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: text || ""
    });
  }

  /** Зарегистрировать команды бота (BotCommand) */
  public async setMyCommands(
    commands: Array<{ command: string; description: string }>
  ): Promise<void> {
    await this.call("setMyCommands", { commands });
  }

  /** Установить webhook */
  public async setWebhook(url: string): Promise<void> {
    await this.call("setWebhook", {
      url,
      allowed_updates: ["message", "callback_query"]
    });
  }

  /** Удалить webhook (вернуться к polling) */
  public async deleteWebhook(): Promise<void> {
    await this.call("deleteWebhook", {});
  }

  // ─── Escaping helpers ──────────────────────────────────────────────────────

  /**
   * Экранирует спецсимволы MarkdownV2.
   * Используй для любого пользовательского текста в MarkdownV2-сообщениях.
   */
  public static escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async call(method: string, body: Record<string, unknown>): Promise<any> {
    const resp = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.text().catch(() => resp.statusText);
      console.error(`[TelegramApiClient] ${method} failed:`, err);
      // Не кидаем — чтобы ошибка отправки не ломала бизнес-логику
    }

    return resp.json().catch(() => null);
  }
}
