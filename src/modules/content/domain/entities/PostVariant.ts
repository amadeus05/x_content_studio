import { Entity } from "../../../../shared/domain/Entity.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { TweetContent } from "../value-objects/TweetContent.ts";

export interface PostVariantProps {
  postId: string;
  hook: string;
  body: string;
  variantLabel: string;
  orderIndex: number;
  pinnedBodyId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PostVariant extends Entity<PostVariantProps> {
  private constructor(props: PostVariantProps, id?: string) {
    super(props, id);
  }

  get postId(): string {
    return this.props.postId;
  }

  get hook(): string {
    return this.props.hook;
  }

  get body(): string {
    return this.props.body;
  }

  get variantLabel(): string {
    return this.props.variantLabel;
  }

  get pinnedBodyId(): string | null | undefined {
    return this.props.pinnedBodyId;
  }

  get orderIndex(): number {
    return this.props.orderIndex;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Полный текст твита: связка хука и тела
   */
  public getFullText(): string {
    if (!this.props.hook) return this.props.body;
    if (!this.props.body) return this.props.hook;
    return `${this.props.hook}\n\n${this.props.body}`;
  }

  public getTweetContent(): TweetContent {
    return TweetContent.create(this.getFullText()).getValue();
  }

  public updateContent(hook: string, body: string): void {
    this.props.hook = hook.trim();
    this.props.body = body.trim();
    this.props.updatedAt = new Date();
  }

  public updateLabel(label: string): void {
    this.props.variantLabel = label.trim() || "Вариант";
    this.props.updatedAt = new Date();
  }

  public setPinnedBody(bodyId: string | null): void {
    this.props.pinnedBodyId = bodyId || null;
    this.props.updatedAt = new Date();
  }

  public static create(
    props: {
      postId: string;
      hook?: string;
      body?: string;
      variantLabel?: string;
      pinnedBodyId?: string | null;
      orderIndex?: number;
      createdAt?: Date;
      updatedAt?: Date;
    },
    id?: string
  ): Result<PostVariant> {
    const now = new Date();
    const variant = new PostVariant(
      {
        postId: props.postId,
        hook: props.hook || "",
        body: props.body || "",
        variantLabel: props.variantLabel || "Вариант 1",
        pinnedBodyId: props.pinnedBodyId ?? null,
        orderIndex: props.orderIndex ?? 0,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now
      },
      id
    );

    return Result.ok(variant);
  }
}
