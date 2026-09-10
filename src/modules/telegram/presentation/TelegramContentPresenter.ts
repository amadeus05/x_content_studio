import type { GeneratedPostContent } from "../../content/application/services/ContentAiGenerator.ts";

/**
 * Presenter for formatting application content results into Telegram Markdown strings.
 * Isolates Telegram-specific presentation from business logic and use cases.
 */
export class TelegramContentPresenter {
  /**
   * Escapes Telegram Markdown/MarkdownV2 reserved characters.
   */
  public escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
  }

  /**
   * Formats the response for content.create with 1 or multiple variants.
   */
  public formatCreated(
    topic: string,
    variants: GeneratedPostContent[],
    postId: string
  ): string {
    const esc = (t: string) => this.escapeMarkdown(t);
    const variantCount = variants.length;

    const lines: string[] = [
      `✍️ Создан пост на тему: *${esc(topic)}*\n`,
      `Сгенерировано вариантов: *${variantCount}*\n`
    ];

    for (let i = 0; i < variants.length; i++) {
      lines.push(`*Вариант ${i + 1}:*`);
      lines.push(esc(variants[i].hook));
      const bodyPreview = variants[i].body.slice(0, 200);
      lines.push(esc(bodyPreview) + (variants[i].body.length > 200 ? "…" : ""));
      lines.push("");
    }

    lines.push(`🆔 \`${postId}\``);

    if (variantCount > 1) {
      lines.push(
        `\n💡 Напиши *«Первый»*, *«Второй»* и т.д. чтобы выбрать вариант, или уточни что изменить.`
      );
    } else {
      lines.push(`\n💡 Напиши что изменить или *«поставь завтра на 12»* чтобы запланировать.`);
    }

    return lines.join("\n");
  }

  /**
   * Formats the response for content.edit.
   */
  public formatEdited(hook: string, body: string, versionNumber?: number): string {
    const esc = (t: string) => this.escapeMarkdown(t);
    const versionHeader = versionNumber && versionNumber > 1 ? ` (Версия ${versionNumber})` : "";
    return `✅ Вариант обновлён${versionHeader}:\n\n${esc(hook)}\n\n${esc(body.slice(0, 300))}${body.length > 300 ? "…" : ""}`;
  }

  /**
   * Formats the response for content.regenerate.
   */
  public formatRegenerated(hook: string, body: string, versionNumber?: number): string {
    const esc = (t: string) => this.escapeMarkdown(t);
    const versionHeader = versionNumber && versionNumber > 1 ? ` (Версия ${versionNumber})` : "";
    return `🔄 Вариант перегенерирован${versionHeader}:\n\n*${esc(hook)}*\n\n${esc(body.slice(0, 300))}${body.length > 300 ? "…" : ""}`;
  }

  /**
   * Formats the response for content.select_variant.
   */
  public formatVariantSelected(
    variantNumber: number,
    hook: string,
    body: string,
    versionNumber?: number
  ): string {
    const esc = (t: string) => this.escapeMarkdown(t);
    const versionHeader = versionNumber && versionNumber > 1 ? ` (Версия ${versionNumber})` : "";
    return `✅ Выбран вариант *${variantNumber}*${versionHeader}:\n\n*${esc(hook)}*\n\n${esc(body.slice(0, 300))}${body.length > 300 ? "…" : ""}\n\n💡 Напиши что изменить, или *«поставь завтра на 12»* чтобы запланировать.`;
  }

  /**
   * Formats response when no active post exists in context.
   */
  public formatNoActivePost(action?: string): string {
    if (action === "select_variant") {
      return "💬 Не понимаю, из чего выбрать. Нет активного поста. Попробуй создать контент сначала.";
    }
    return "💬 Нет активного поста. Сначала создай контент, например:\n*«Сделай пост про AI-агентов»*";
  }

  /**
   * Formats stub response for actions under development.
   */
  public formatStub(action: string): string {
    return `⚙️ Функция *${action}* пока в разработке. Скоро появится!`;
  }

  /**
   * Formats an error response message.
   */
  public formatError(message: string): string {
    return `❌ ${message}`;
  }
}
