import { ValueObject } from "../../../../shared/domain/ValueObject.ts";
import { Result } from "../../../../shared/domain/Result.ts";

interface TweetContentProps {
  rawText: string;
}

export interface CharacterCountInfo {
  totalChars: number;
  maxStandardChars: number;
  remainingChars: number;
  isOverLimit: boolean;
  percentageUsed: number;
  isPremiumLongForm: boolean;
}

export class TweetContent extends ValueObject<TweetContentProps> {
  public static readonly STANDARD_LIMIT = 280;

  private constructor(props: TweetContentProps) {
    super(props);
  }

  get text(): string {
    return this.props.rawText;
  }

  /**
   * Подсчет символов по правилам X (Twitter):
   * - URL (http:// или https://) считаются как 23 символа.
   * - Эмодзи и специальные символы UTF-16 surrogate pairs.
   */
  public getCountInfo(): CharacterCountInfo {
    const text = this.props.rawText || "";

    // Заменяем ссылки на 23-символьные маркеры
    const urlRegex = /https?:\/\/[^\s]+/g;
    const textWithNormalizedUrls = text.replace(urlRegex, "x".repeat(23));

    // Точный подсчет с учетом emoji (через Spread/Intl Segmenter)
    const totalChars = [...textWithNormalizedUrls].length;
    const remainingChars = TweetContent.STANDARD_LIMIT - totalChars;
    const isOverLimit = remainingChars < 0;
    const percentageUsed = Math.min(100, Math.round((totalChars / TweetContent.STANDARD_LIMIT) * 100));

    return {
      totalChars,
      maxStandardChars: TweetContent.STANDARD_LIMIT,
      remainingChars,
      isOverLimit,
      percentageUsed,
      isPremiumLongForm: totalChars > TweetContent.STANDARD_LIMIT
    };
  }

  public static create(text: string): Result<TweetContent> {
    return Result.ok(new TweetContent({ rawText: text ?? "" }));
  }
}
