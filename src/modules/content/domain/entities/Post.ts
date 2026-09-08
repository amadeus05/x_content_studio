import { Entity } from "../../../../shared/domain/Entity.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { PostStatus } from "../value-objects/PostStatus.ts";
import { PostVariant } from "./PostVariant.ts";

export interface PostMetrics {
  impressions?: number;
  likes?: number;
  retweets?: number;
  replies?: number;
  bookmarks?: number;
}

export interface PostProps {
  status: PostStatus;
  variants: PostVariant[];
  activeVariantId: string;
  tags: string[];
  notes: string;
  tweetUrl: string;
  metrics: PostMetrics;
  scheduledFor?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Post extends Entity<PostProps> {
  private constructor(props: PostProps, id?: string) {
    super(props, id);
  }

  get status(): PostStatus {
    return this.props.status;
  }

  get variants(): PostVariant[] {
    return [...this.props.variants];
  }

  get activeVariantId(): string {
    return this.props.activeVariantId;
  }

  get tags(): string[] {
    return [...this.props.tags];
  }

  get notes(): string {
    return this.props.notes;
  }

  get tweetUrl(): string {
    return this.props.tweetUrl;
  }

  get metrics(): PostMetrics {
    return { ...this.props.metrics };
  }

  get scheduledFor(): Date | null | undefined {
    return this.props.scheduledFor;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public getActiveVariant(): PostVariant {
    const found = this.props.variants.find((v) => v.id === this.props.activeVariantId);
    if (found) return found;
    return this.props.variants[0];
  }

  public setActiveVariant(variantId: string): Result<void> {
    const exists = this.props.variants.some((v) => v.id === variantId);
    if (!exists) {
      return Result.fail(`Вариант с ID ${variantId} не найден в посте`);
    }
    this.props.activeVariantId = variantId;
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public addVariant(hook: string, body: string, label?: string): Result<PostVariant> {
    const nextIndex = this.props.variants.length;
    const variantOrError = PostVariant.create({
      postId: this.id,
      hook,
      body,
      variantLabel: label || `Вариант ${nextIndex + 1}`,
      orderIndex: nextIndex
    });

    if (variantOrError.isFailure) {
      return Result.fail(variantOrError.getError());
    }

    const variant = variantOrError.getValue();
    this.props.variants.push(variant);
    this.props.updatedAt = new Date();

    return Result.ok(variant);
  }

  public ensureVariant(variantId: string, hook = "", body = ""): PostVariant {
    const existing = this.props.variants.find((v) => v.id === variantId);
    if (existing) return existing;

    const variant = PostVariant.create(
      {
        postId: this.id,
        hook,
        body,
        variantLabel: `Вариант ${this.props.variants.length + 1}`,
        orderIndex: this.props.variants.length
      },
      variantId
    ).getValue();

    this.props.variants.push(variant);
    if (!this.props.variants.some((v) => v.id === this.props.activeVariantId)) {
      this.props.activeVariantId = variant.id;
    }
    this.props.updatedAt = new Date();
    return variant;
  }

  public removeVariant(variantId: string): Result<void> {
    if (this.props.variants.length <= 1) {
      return Result.fail("Нельзя удалить единственный вариант поста");
    }

    this.props.variants = this.props.variants.filter((v) => v.id !== variantId);
    if (this.props.activeVariantId === variantId) {
      this.props.activeVariantId = this.props.variants[0].id;
    }
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public changeStatus(newStatus: PostStatus): Result<void> {
    if (!this.props.status.canTransitionTo(newStatus)) {
      return Result.fail(
        `Недопустимый переход статуса из "${this.props.status.label}" в "${newStatus.label}"`
      );
    }

    // Инвариант: нельзя перевести в Опубликован или Готов без контента
    if (newStatus.value === "READY" || newStatus.value === "POSTED") {
      const active = this.getActiveVariant();
      if (!active || active.getFullText().trim().length === 0) {
        return Result.fail("Нельзя перевести пост в статус Готов/Опубликован без текста");
      }
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public addTag(tag: string): void {
    const cleanTag = tag.trim().replace(/^#/, "");
    if (cleanTag && !this.props.tags.includes(cleanTag)) {
      this.props.tags.push(cleanTag);
      this.props.updatedAt = new Date();
    }
  }

  public removeTag(tag: string): void {
    const cleanTag = tag.trim().replace(/^#/, "");
    this.props.tags = this.props.tags.filter((t) => t !== cleanTag);
    this.props.updatedAt = new Date();
  }

  public updateNotes(notes: string): void {
    this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  public markAsPosted(tweetUrl?: string, metrics?: PostMetrics): Result<void> {
    const statusRes = this.changeStatus(PostStatus.POSTED);
    if (statusRes.isFailure) {
      return statusRes;
    }
    if (tweetUrl) this.props.tweetUrl = tweetUrl;
    if (metrics) this.props.metrics = { ...this.props.metrics, ...metrics };
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public updateMetrics(metrics: PostMetrics): void {
    this.props.metrics = { ...this.props.metrics, ...metrics };
    this.props.updatedAt = new Date();
  }

  public static create(
    props: {
      status?: PostStatus;
      variants?: PostVariant[];
      activeVariantId?: string;
      tags?: string[];
      notes?: string;
      tweetUrl?: string;
      metrics?: PostMetrics;
      scheduledFor?: Date | null;
      createdAt?: Date;
      updatedAt?: Date;
      initialHook?: string;
      initialBody?: string;
    },
    id?: string
  ): Result<Post> {
    const now = new Date();
    const postId = id ?? crypto.randomUUID();
    let variants = props.variants ? [...props.variants] : [];

    // Если вариантов нет, создаем дефолтный начальный вариант
    if (variants.length === 0) {
      const defaultVariantRes = PostVariant.create({
        postId,
        hook: props.initialHook || "",
        body: props.initialBody || "",
        variantLabel: "Вариант 1",
        orderIndex: 0
      });
      if (defaultVariantRes.isFailure) {
        return Result.fail(defaultVariantRes.getError());
      }
      variants = [defaultVariantRes.getValue()];
    }

    const activeVariantId = props.activeVariantId && variants.some(v => v.id === props.activeVariantId)
      ? props.activeVariantId
      : variants[0].id;

    const post = new Post(
      {
        status: props.status ?? PostStatus.DRAFT,
        variants,
        activeVariantId,
        tags: props.tags ?? [],
        notes: props.notes ?? "",
        tweetUrl: props.tweetUrl ?? "",
        metrics: props.metrics ?? {},
        scheduledFor: props.scheduledFor ?? null,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now
      },
      postId
    );

    return Result.ok(post);
  }
}
