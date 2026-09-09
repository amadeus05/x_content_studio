import { Entity } from "../../../../shared/domain/Entity.ts";
import { Result } from "../../../../shared/domain/Result.ts";

export interface PostHookProps {
  postId: string;
  text: string;
  label: string;
  pinnedBodyId?: string | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PostHook extends Entity<PostHookProps> {
  private constructor(props: PostHookProps, id?: string) {
    super(props, id);
  }

  get postId(): string {
    return this.props.postId;
  }

  get text(): string {
    return this.props.text;
  }

  get label(): string {
    return this.props.label;
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

  public updateText(text: string): void {
    this.props.text = text;
    this.props.updatedAt = new Date();
  }

  public updateLabel(label: string): void {
    this.props.label = label.trim() || "Хук";
    this.props.updatedAt = new Date();
  }

  public setPinnedBody(bodyId: string | null): void {
    this.props.pinnedBodyId = bodyId || null;
    this.props.updatedAt = new Date();
  }

  public static create(
    props: {
      postId: string;
      text?: string;
      label?: string;
      pinnedBodyId?: string | null;
      orderIndex?: number;
      createdAt?: Date;
      updatedAt?: Date;
    },
    id?: string
  ): Result<PostHook> {
    const now = new Date();
    const hook = new PostHook(
      {
        postId: props.postId,
        text: props.text || "",
        label: props.label || "Хук 1",
        pinnedBodyId: props.pinnedBodyId ?? null,
        orderIndex: props.orderIndex ?? 0,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now
      },
      id
    );

    return Result.ok(hook);
  }
}
