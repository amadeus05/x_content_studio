import type { IPostRepository } from "../../../content/domain/repositories/IPostRepository.ts";
import { SearchPostsUseCase } from "../../../content/application/use-cases/SearchPostsUseCase.ts";
import { TelegramApiClient } from "../../infrastructure/TelegramApiClient.ts";
import type { PostDto } from "../../../content/application/dtos/PostDto.ts";

export interface FindPostViaBotParams {
  query: string;
}

export interface FindPostViaBotResult {
  found: number;
  /** Готовый текст для отправки в Telegram (MarkdownV2) */
  telegramText: string;
}

const MAX_RESULTS = 5;
const MAX_TEXT_PREVIEW = 300;

/**
 * Use case: поиск постов по запросу и форматирование для Telegram.
 * Работает с PostDto (результат SearchPostsUseCase).
 */
export class FindPostViaBotUseCase {
  private readonly searchPostsUseCase: SearchPostsUseCase;

  constructor(private readonly postRepo: IPostRepository) {
    this.searchPostsUseCase = new SearchPostsUseCase(postRepo);
  }

  public async execute(params: FindPostViaBotParams): Promise<FindPostViaBotResult> {
    const { query } = params;

    const result = await this.searchPostsUseCase.execute({ search: query });
    const posts = result.getValue() as PostDto[];

    if (posts.length === 0) {
      return {
        found: 0,
        telegramText: `🔍 Ничего не найдено по запросу *${esc(query)}*`
      };
    }

    const limited = posts.slice(0, MAX_RESULTS);
    const lines: string[] = [
      `🔍 Найдено *${posts.length}* ${pluralPost(posts.length)} по запросу *${esc(query)}*:`
    ];

    if (posts.length > MAX_RESULTS) {
      lines.push(`_Показываю первые ${MAX_RESULTS}_`);
    }

    lines.push("");

    for (let i = 0; i < limited.length; i++) {
      const post = limited[i];
      const hookText = post.activeHook?.text || post.hooks?.[0]?.text || "—";
      const bodyText = post.activeBody?.text || post.bodies?.[0]?.text || "";
      const status = statusEmoji(post.status);
      const date = new Date(post.updatedAt).toLocaleDateString("ru-RU");

      lines.push(
        `*${i + 1}\\. ${esc(hookText)}*`,
        `${status} ${esc(post.status)} • ${esc(date)}`
      );

      if (bodyText.trim()) {
        const preview =
          bodyText.length > MAX_TEXT_PREVIEW
            ? bodyText.slice(0, MAX_TEXT_PREVIEW) + "…"
            : bodyText;
        lines.push(esc(preview));
      }

      if (post.tags && post.tags.length > 0) {
        const tagStr = post.tags.map((t) => `#${t}`).join(" ");
        lines.push(`_${esc(tagStr)}_`);
      }

      lines.push(`🆔 \`${post.id}\``);
      lines.push("");
    }

    return {
      found: posts.length,
      telegramText: lines.join("\n")
    };
  }
}

function esc(text: string): string {
  return TelegramApiClient.escapeMarkdown(text);
}

function statusEmoji(status: string): string {
  const map: Record<string, string> = {
    IDEA: "💡",
    DRAFT: "✏️",
    READY: "✅",
    PUBLISHED: "🚀",
    ARCHIVED: "📦"
  };
  return map[status] || "📄";
}

function pluralPost(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "пост";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "поста";
  return "постов";
}
