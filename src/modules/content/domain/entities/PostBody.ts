import { Entity } from "../../../../shared/domain/Entity.ts";
import { Result } from "../../../../shared/domain/Result.ts";

export interface PostBodyProps {
  postId: string;
  text: string;
  label: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PostBody extends Entity<PostBodyProps> {
  private constructor(props: PostBodyProps, id?: string) {
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
    this.props.label = label.trim() || "Тело поста";
    this.props.updatedAt = new Date();
  }

  public static create(
    props: {
      postId: string;
      text?: string;
      label?: string;
      orderIndex?: number;
      createdAt?: Date;
      updatedAt?: Date;
    },
    id?: string
  ): Result<PostBody> {
    const now = new Date();
    const body = new PostBody(
      {
        postId: props.postId,
        text: props.text || "",
        label: props.label || "Тело 1",
        orderIndex: props.orderIndex ?? 0,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now
      },
      id
    );

    return Result.ok(body);
  }
}
