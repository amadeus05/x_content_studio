import { ValueObject } from "../../../../shared/domain/ValueObject.ts";
import { Result } from "../../../../shared/domain/Result.ts";

export type PostStatusType = "IDEA" | "DRAFT" | "AI_REVIEW" | "READY" | "POSTED" | "ARCHIVED";

interface PostStatusProps {
  value: PostStatusType;
}

export class PostStatus extends ValueObject<PostStatusProps> {
  public static readonly IDEA = new PostStatus({ value: "IDEA" });
  public static readonly DRAFT = new PostStatus({ value: "DRAFT" });
  public static readonly AI_REVIEW = new PostStatus({ value: "AI_REVIEW" });
  public static readonly READY = new PostStatus({ value: "READY" });
  public static readonly POSTED = new PostStatus({ value: "POSTED" });
  public static readonly ARCHIVED = new PostStatus({ value: "ARCHIVED" });

  private constructor(props: PostStatusProps) {
    super(props);
  }

  get value(): PostStatusType {
    return this.props.value;
  }

  get label(): string {
    switch (this.props.value) {
      case "IDEA":
        return "💡 Идея";
      case "DRAFT":
        return "✍️ Черновик";
      case "AI_REVIEW":
        return "🤖 На доработке AI";
      case "READY":
        return "⏳ Готов к публикации";
      case "POSTED":
        return "🚀 Опубликован";
      case "ARCHIVED":
        return "📦 В архиве";
    }
  }

  get badgeColor(): string {
    switch (this.props.value) {
      case "IDEA":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "DRAFT":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "AI_REVIEW":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "READY":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "POSTED":
        return "bg-sky-500/15 text-sky-400 border-sky-500/30";
      case "ARCHIVED":
        return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    }
  }

  public canTransitionTo(nextStatus: PostStatus): boolean {
    const from = this.props.value;
    const to = nextStatus.value;

    if (from === to) return true;

    const validTransitions: Record<PostStatusType, PostStatusType[]> = {
      IDEA: ["DRAFT", "ARCHIVED"],
      DRAFT: ["AI_REVIEW", "READY", "POSTED", "ARCHIVED"],
      AI_REVIEW: ["DRAFT", "READY", "ARCHIVED"],
      READY: ["POSTED", "DRAFT", "ARCHIVED"],
      POSTED: ["ARCHIVED", "DRAFT"],
      ARCHIVED: ["DRAFT", "IDEA"]
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  public static create(statusStr: string): Result<PostStatus> {
    const upper = statusStr.toUpperCase() as PostStatusType;
    const allowed: PostStatusType[] = ["IDEA", "DRAFT", "AI_REVIEW", "READY", "POSTED", "ARCHIVED"];

    if (!allowed.includes(upper)) {
      return Result.fail(`Недопустимый статус поста: ${statusStr}`);
    }

    return Result.ok(new PostStatus({ value: upper }));
  }
}
