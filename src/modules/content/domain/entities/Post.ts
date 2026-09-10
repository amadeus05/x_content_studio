import { Entity } from "../../../../shared/domain/Entity.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { PostStatus } from "../value-objects/PostStatus.ts";
import { PostVariant } from "./PostVariant.ts";
import { PostHook } from "./PostHook.ts";
import { PostBody } from "./PostBody.ts";

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
  hooks: PostHook[];
  bodies: PostBody[];
  activeHookId: string;
  activeBodyId: string;
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
    return this.getVariants();
  }

  get activeVariantId(): string {
    return this.props.activeVariantId;
  }

  get hooks(): PostHook[] {
    return [...this.props.hooks];
  }

  get bodies(): PostBody[] {
    return [...this.props.bodies];
  }

  get activeHookId(): string {
    return this.props.activeHookId;
  }

  get activeBodyId(): string {
    return this.props.activeBodyId;
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

  // ─── PostVariant Lifecycle ──────────────────────────────────────────────────

  public getVariants(): PostVariant[] {
    return [...this.props.variants].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getVariantById(variantId: string): PostVariant | undefined {
    return this.props.variants.find((v) => v.id === variantId);
  }

  public getActiveVariant(): PostVariant {
    const found = this.props.variants.find((v) => v.id === this.props.activeVariantId);
    if (found) return found;
    return this.props.variants[0];
  }

  public selectVariant(variantId: string): Result<void> {
    const variant = this.props.variants.find((v) => v.id === variantId);
    if (!variant) {
      return Result.fail(`Вариант с ID ${variantId} не найден в посте ${this.id}`);
    }

    this.props.activeVariantId = variantId;

    // Backward compatibility with legacy activeHookId/activeBodyId
    const matchingHook = this.props.hooks.find((h) => h.id === variantId);
    if (matchingHook) {
      this.props.activeHookId = matchingHook.id;
    }

    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public addVariant(
    hook: string = "",
    body: string = "",
    label?: string,
    actionMetadata?: string
  ): Result<PostVariant> {
    const nextIndex = this.props.variants.length;
    const variantRes = PostVariant.create({
      postId: this.id,
      label: label || `Вариант ${nextIndex + 1}`,
      orderIndex: nextIndex,
      hook,
      body
    });

    if (variantRes.isFailure) {
      return Result.fail(variantRes.getError());
    }

    const variant = variantRes.getValue();
    this.props.variants.push(variant);

    if (!this.props.activeVariantId || this.props.variants.length === 1) {
      this.props.activeVariantId = variant.id;
    }

    // Backward compat with hooks & bodies
    this.syncLegacyHookAndBody(variant, hook, body, label);

    this.props.updatedAt = new Date();
    return Result.ok(variant);
  }

  public removeVariant(variantId: string): Result<void> {
    if (this.props.variants.length <= 1) {
      return Result.fail("Нельзя удалить единственный вариант поста");
    }

    this.props.variants = this.props.variants.filter((v) => v.id !== variantId);
    if (this.props.activeVariantId === variantId) {
      this.props.activeVariantId = this.props.variants[0].id;
    }

    this.props.hooks = this.props.hooks.filter((h) => h.id !== variantId);
    if (this.props.activeHookId === variantId && this.props.hooks.length > 0) {
      this.props.activeHookId = this.props.hooks[0].id;
    }

    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public ensureVariant(variantId: string, hook = "", body = ""): PostVariant {
    const existing = this.getVariantById(variantId);
    if (existing) return existing;
    const added = this.addVariant(hook, body).getValue();
    return added;
  }

  public setActiveVariant(variantId: string): Result<void> {
    return this.selectVariant(variantId);
  }

  public getFullText(): string {
    const active = this.getActiveVariant();
    if (active) return active.getFullText();

    const activeHook = this.getActiveHook();
    const activeBody = this.getActiveBody();
    const hookText = activeHook ? activeHook.text : "";
    const bodyText = activeBody ? activeBody.text : "";
    if (hookText && bodyText) return `${hookText}\n\n${bodyText}`;
    return hookText || bodyText;
  }

  // ─── Legacy Hook / Body Helpers (Backward Compatibility) ────────────────────

  public getActiveHook(): PostHook {
    const found = this.props.hooks.find((h) => h.id === this.props.activeHookId);
    if (found) return found;
    return this.props.hooks[0];
  }

  public getActiveBody(): PostBody {
    const found = this.props.bodies.find((b) => b.id === this.props.activeBodyId);
    if (found) return found;
    return this.props.bodies[0];
  }

  public selectHook(hookId: string): Result<void> {
    const hook = this.props.hooks.find((h) => h.id === hookId);
    if (!hook) return Result.fail(`Хук с ID ${hookId} не найден`);
    this.props.activeHookId = hookId;
    this.props.activeVariantId = hookId;
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public addHook(text: string = "", label?: string, pinnedBodyId?: string | null): Result<PostHook> {
    const nextIndex = this.props.hooks.length;
    const hookRes = PostHook.create({
      postId: this.id,
      text,
      label: label || `Хук ${nextIndex + 1}`,
      pinnedBodyId: pinnedBodyId ?? null,
      orderIndex: nextIndex
    });
    if (hookRes.isFailure) return Result.fail(hookRes.getError());
    const hook = hookRes.getValue();
    this.props.hooks.push(hook);
    this.props.activeHookId = hook.id;
    this.props.updatedAt = new Date();
    return Result.ok(hook);
  }

  public updateHook(hookId: string, text: string, label?: string): Result<void> {
    const hook = this.props.hooks.find((h) => h.id === hookId);
    if (!hook) return Result.fail(`Хук с ID ${hookId} не найден`);
    hook.updateText(text);
    if (label !== undefined) hook.updateLabel(label);
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public pinBodyToHook(hookId: string, bodyId: string | null): Result<void> {
    const hook = this.props.hooks.find((h) => h.id === hookId);
    if (!hook) return Result.fail(`Хук с ID ${hookId} не найден`);
    hook.setPinnedBody(bodyId);
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public removeHook(hookId: string): Result<void> {
    if (this.props.hooks.length <= 1) return Result.fail("Нельзя удалить единственный хук поста");
    this.props.hooks = this.props.hooks.filter((h) => h.id !== hookId);
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public selectBody(bodyId: string): Result<void> {
    const body = this.props.bodies.find((b) => b.id === bodyId);
    if (!body) return Result.fail(`Тело с ID ${bodyId} не найдено`);
    this.props.activeBodyId = bodyId;
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public addBody(text: string = "", label?: string): Result<PostBody> {
    const nextIndex = this.props.bodies.length;
    const bodyRes = PostBody.create({
      postId: this.id,
      text,
      label: label || `Тело ${nextIndex + 1}`,
      orderIndex: nextIndex
    });
    if (bodyRes.isFailure) return Result.fail(bodyRes.getError());
    const body = bodyRes.getValue();
    this.props.bodies.push(body);
    this.props.activeBodyId = body.id;
    this.props.updatedAt = new Date();
    return Result.ok(body);
  }

  public updateBody(bodyId: string, text: string, label?: string): Result<void> {
    const body = this.props.bodies.find((b) => b.id === bodyId);
    if (!body) return Result.fail(`Тело с ID ${bodyId} не найдено`);
    body.updateText(text);
    if (label !== undefined) body.updateLabel(label);
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public removeBody(bodyId: string): Result<void> {
    if (this.props.bodies.length <= 1) return Result.fail("Нельзя удалить единственное тело поста");
    this.props.bodies = this.props.bodies.filter((b) => b.id !== bodyId);
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  private syncLegacyHookAndBody(
    variant: PostVariant,
    hookText: string,
    bodyText: string,
    label?: string
  ): void {
    const legacyHook = PostHook.create(
      {
        postId: this.id,
        text: hookText,
        label: label || variant.label,
        orderIndex: variant.orderIndex
      },
      variant.id
    ).getValue();
    this.props.hooks.push(legacyHook);

    const legacyBody = PostBody.create({
      postId: this.id,
      text: bodyText,
      label: `Тело ${variant.orderIndex + 1}`,
      orderIndex: variant.orderIndex
    }).getValue();
    this.props.bodies.push(legacyBody);
  }

  // ─── Status & Metadata ──────────────────────────────────────────────────────

  public changeStatus(newStatus: PostStatus): Result<void> {
    if (!this.props.status.canTransitionTo(newStatus)) {
      return Result.fail(
        `Недопустимый переход статуса из "${this.props.status.label}" в "${newStatus.label}"`
      );
    }

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
    if (statusRes.isFailure) return statusRes;
    if (tweetUrl) this.props.tweetUrl = tweetUrl;
    if (metrics) this.props.metrics = { ...this.props.metrics, ...metrics };
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public updateMetrics(metrics: PostMetrics): void {
    this.props.metrics = { ...this.props.metrics, ...metrics };
    this.props.updatedAt = new Date();
  }

  // ─── Factory ────────────────────────────────────────────────────────────────

  public static create(
    props: {
      status?: PostStatus;
      variants?: PostVariant[];
      activeVariantId?: string;
      hooks?: PostHook[];
      bodies?: PostBody[];
      activeHookId?: string;
      activeBodyId?: string;
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

    // 1. Инициализация variants
    let variants: PostVariant[] = [];
    if (props.variants && props.variants.length > 0) {
      variants = [...props.variants];
    } else if (props.hooks && props.hooks.length > 0) {
      variants = props.hooks.map((h, idx) => {
        const bodyText = props.bodies && props.bodies[idx] ? props.bodies[idx].text : "";
        return PostVariant.create(
          {
            postId,
            label: h.label,
            orderIndex: h.orderIndex ?? idx,
            hook: h.text,
            body: bodyText,
            createdAt: h.createdAt,
            updatedAt: h.updatedAt
          },
          h.id
        ).getValue();
      });
    } else {
      const initialVariant = PostVariant.create({
        postId,
        label: "Вариант 1",
        orderIndex: 0,
        hook: props.initialHook || "",
        body: props.initialBody || ""
      }).getValue();
      variants = [initialVariant];
    }

    const activeVariantId =
      props.activeVariantId && variants.some((v) => v.id === props.activeVariantId)
        ? props.activeVariantId
        : variants[0].id;

    // 2. Инициализация hooks & bodies для backward compat
    let hooks: PostHook[] = [];
    let bodies: PostBody[] = [];
    if (props.hooks && props.hooks.length > 0) {
      hooks = [...props.hooks];
      bodies = props.bodies ? [...props.bodies] : [];
    } else {
      hooks = variants.map((v) =>
        PostHook.create(
          {
            postId,
            text: v.hook,
            label: v.label,
            orderIndex: v.orderIndex
          },
          v.id
        ).getValue()
      );
      bodies = variants.map((v) =>
        PostBody.create(
          {
            postId,
            text: v.body,
            label: `Тело ${v.orderIndex + 1}`,
            orderIndex: v.orderIndex
          },
          `${v.id}:body`
        ).getValue()
      );
    }

    const activeHookId =
      props.activeHookId && hooks.some((h) => h.id === props.activeHookId)
        ? props.activeHookId
        : activeVariantId;

    const activeBodyId =
      props.activeBodyId && bodies.some((b) => b.id === props.activeBodyId)
        ? props.activeBodyId
        : bodies[0]?.id || "";

    const post = new Post(
      {
        status: props.status ?? PostStatus.DRAFT,
        variants,
        activeVariantId,
        hooks,
        bodies,
        activeHookId,
        activeBodyId,
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
