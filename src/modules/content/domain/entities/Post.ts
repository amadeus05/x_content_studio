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
  hooks: PostHook[];
  bodies: PostBody[];
  activeHookId: string;
  activeBodyId: string;
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

  get variants(): PostVariant[] {
    return this.syncVariants();
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

  /**
   * Возвращает активный вариант твита (комбинация активного хука и активного тела)
   */
  public getActiveVariant(): PostVariant {
    const activeHook = this.getActiveHook();
    const activeBody = this.getActiveBody();

    const variant = PostVariant.create(
      {
        postId: this.id,
        hook: activeHook ? activeHook.text : "",
        body: activeBody ? activeBody.text : "",
        variantLabel: activeHook ? activeHook.label : "Вариант",
        pinnedBodyId: activeHook ? activeHook.pinnedBodyId : null,
        orderIndex: activeHook ? activeHook.orderIndex : 0,
        createdAt: activeHook ? activeHook.createdAt : this.props.createdAt,
        updatedAt: this.props.updatedAt
      },
      activeHook ? activeHook.id : this.props.activeVariantId
    ).getValue();

    return variant;
  }

  /**
   * Вычисляет активную связку: activeHook.text + "\n\n" + activeBody.text
   */
  public getFullText(): string {
    const activeHook = this.getActiveHook();
    const activeBody = this.getActiveBody();
    const hookText = activeHook ? activeHook.text : "";
    const bodyText = activeBody ? activeBody.text : "";
    if (hookText && bodyText) {
      return `${hookText}\n\n${bodyText}`;
    }
    return hookText || bodyText;
  }

  /**
   * Синхронизация виртуального списка вариантов на основе хуков и их тел
   */
  private syncVariants(): PostVariant[] {
    const activeBody = this.getActiveBody();

    return this.props.hooks.map((h, idx) => {
      // Если у хука закреплено конкретное тело — берем его, иначе берем активное тело
      let bodyText = activeBody ? activeBody.text : "";
      if (h.pinnedBodyId) {
        const pinned = this.props.bodies.find((b) => b.id === h.pinnedBodyId);
        if (pinned) bodyText = pinned.text;
      }

      return PostVariant.create(
        {
          postId: this.id,
          hook: h.text,
          body: bodyText,
          variantLabel: h.label || `Вариант ${idx + 1}`,
          pinnedBodyId: h.pinnedBodyId,
          orderIndex: h.orderIndex,
          createdAt: h.createdAt,
          updatedAt: h.updatedAt
        },
        h.id
      ).getValue();
    });
  }

  // === Управление Хуками ===

  public selectHook(hookId: string): Result<void> {
    const hook = this.props.hooks.find((h) => h.id === hookId);
    if (!hook) {
      return Result.fail(`Хук с ID ${hookId} не найден`);
    }

    this.props.activeHookId = hookId;
    this.props.activeVariantId = hookId;

    // Если за хуком закреплено конкретное тело, автоматически переключаем на него
    if (hook.pinnedBodyId) {
      const pinnedExists = this.props.bodies.some((b) => b.id === hook.pinnedBodyId);
      if (pinnedExists) {
        this.props.activeBodyId = hook.pinnedBodyId;
      }
    }

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

    if (hookRes.isFailure) {
      return Result.fail(hookRes.getError());
    }

    const hook = hookRes.getValue();
    this.props.hooks.push(hook);
    this.props.activeHookId = hook.id;
    this.props.activeVariantId = hook.id;
    this.props.updatedAt = new Date();

    return Result.ok(hook);
  }

  public updateHook(hookId: string, text: string, label?: string): Result<void> {
    const hook = this.props.hooks.find((h) => h.id === hookId);
    if (!hook) {
      return Result.fail(`Хук с ID ${hookId} не найден`);
    }

    hook.updateText(text);
    if (label !== undefined) {
      hook.updateLabel(label);
    }
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public pinBodyToHook(hookId: string, bodyId: string | null): Result<void> {
    const hook = this.props.hooks.find((h) => h.id === hookId);
    if (!hook) {
      return Result.fail(`Хук с ID ${hookId} не найден`);
    }

    if (bodyId && !this.props.bodies.some((b) => b.id === bodyId)) {
      return Result.fail(`Тело с ID ${bodyId} не найдено в данном посте`);
    }

    hook.setPinnedBody(bodyId);
    if (bodyId && this.props.activeHookId === hookId) {
      this.props.activeBodyId = bodyId;
    }
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public removeHook(hookId: string): Result<void> {
    if (this.props.hooks.length <= 1) {
      return Result.fail("Нельзя удалить единственный хук поста");
    }

    this.props.hooks = this.props.hooks.filter((h) => h.id !== hookId);
    if (this.props.activeHookId === hookId) {
      this.props.activeHookId = this.props.hooks[0].id;
      this.props.activeVariantId = this.props.hooks[0].id;
    }
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  // === Управление Телами поста ===

  public selectBody(bodyId: string): Result<void> {
    const body = this.props.bodies.find((b) => b.id === bodyId);
    if (!body) {
      return Result.fail(`Тело с ID ${bodyId} не найдено`);
    }

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

    if (bodyRes.isFailure) {
      return Result.fail(bodyRes.getError());
    }

    const body = bodyRes.getValue();
    this.props.bodies.push(body);
    this.props.activeBodyId = body.id;
    this.props.updatedAt = new Date();

    return Result.ok(body);
  }

  public updateBody(bodyId: string, text: string, label?: string): Result<void> {
    const body = this.props.bodies.find((b) => b.id === bodyId);
    if (!body) {
      return Result.fail(`Тело с ID ${bodyId} не найдено`);
    }

    body.updateText(text);
    if (label !== undefined) {
      body.updateLabel(label);
    }
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public removeBody(bodyId: string): Result<void> {
    if (this.props.bodies.length <= 1) {
      return Result.fail("Нельзя удалить единственное тело поста");
    }

    this.props.bodies = this.props.bodies.filter((b) => b.id !== bodyId);

    // Снимаем пины с удаленного тела у хуков
    for (const hook of this.props.hooks) {
      if (hook.pinnedBodyId === bodyId) {
        hook.setPinnedBody(null);
      }
    }

    if (this.props.activeBodyId === bodyId) {
      this.props.activeBodyId = this.props.bodies[0].id;
    }
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  // === Обратная совместимость с PostVariant API ===

  public setActiveVariant(variantId: string): Result<void> {
    return this.selectHook(variantId);
  }

  public addVariant(hook: string, body: string, label?: string): Result<PostVariant> {
    const hookRes = this.addHook(hook, label);
    if (hookRes.isFailure) return Result.fail(hookRes.getError());

    // Если передано тело, обновляем активное тело или добавляем новое
    if (body && body.trim().length > 0) {
      const activeBody = this.getActiveBody();
      if (activeBody && !activeBody.text) {
        activeBody.updateText(body);
      } else if (activeBody && activeBody.text !== body) {
        const newBody = this.addBody(body, `Тело ${this.props.bodies.length + 1}`);
        if (newBody.isSuccess) {
          hookRes.getValue().setPinnedBody(newBody.getValue().id);
        }
      }
    }

    return Result.ok(this.getActiveVariant());
  }

  public ensureVariant(variantId: string, hook = "", body = ""): PostVariant {
    const existing = this.props.hooks.find((h) => h.id === variantId);
    if (existing) {
      return this.getActiveVariant();
    }

    this.addHook(hook, `Хук ${this.props.hooks.length + 1}`);
    return this.getActiveVariant();
  }

  public removeVariant(variantId: string): Result<void> {
    return this.removeHook(variantId);
  }

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
      hooks?: PostHook[];
      bodies?: PostBody[];
      activeHookId?: string;
      activeBodyId?: string;
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

    // 1. Инициализация хуков
    let hooks: PostHook[] = [];
    if (props.hooks && props.hooks.length > 0) {
      hooks = [...props.hooks];
    } else if (props.variants && props.variants.length > 0) {
      hooks = props.variants.map((v, idx) =>
        PostHook.create(
          {
            postId,
            text: v.hook,
            label: v.variantLabel || `Хук ${idx + 1}`,
            pinnedBodyId: v.pinnedBodyId ?? null,
            orderIndex: v.orderIndex ?? idx,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt
          },
          v.id
        ).getValue()
      );
    } else {
      const defaultHook = PostHook.create({
        postId,
        text: props.initialHook || "",
        label: "Хук 1",
        orderIndex: 0
      }).getValue();
      hooks = [defaultHook];
    }

    // 2. Инициализация тел поста
    let bodies: PostBody[] = [];
    if (props.bodies && props.bodies.length > 0) {
      bodies = [...props.bodies];
    } else {
      // Извлекаем тела из переданных вариантов или initialBody
      const initialBodyText =
        props.initialBody !== undefined
          ? props.initialBody
          : props.variants && props.variants.length > 0
          ? props.variants[0].body
          : "";

      const defaultBody = PostBody.create({
        postId,
        text: initialBodyText,
        label: "Тело 1",
        orderIndex: 0
      }).getValue();

      bodies = [defaultBody];

      // Если в старых вариантах были разные тела, импортируем их как отдельные тела
      if (props.variants && props.variants.length > 1) {
        for (let i = 1; i < props.variants.length; i++) {
          const v = props.variants[i];
          if (v.body && v.body.trim() && !bodies.some((b) => b.text === v.body)) {
            const extraBody = PostBody.create({
              postId,
              text: v.body,
              label: `Тело ${bodies.length + 1}`,
              orderIndex: bodies.length
            }).getValue();
            bodies.push(extraBody);
            // Привязываем этот хук к его уникальному телу
            if (hooks[i]) {
              hooks[i].setPinnedBody(extraBody.id);
            }
          }
        }
      }
    }

    const activeHookId =
      props.activeHookId && hooks.some((h) => h.id === props.activeHookId)
        ? props.activeHookId
        : props.activeVariantId && hooks.some((h) => h.id === props.activeVariantId)
        ? props.activeVariantId
        : hooks[0].id;

    const activeHook = hooks.find((h) => h.id === activeHookId) || hooks[0];

    const activeBodyId =
      props.activeBodyId && bodies.some((b) => b.id === props.activeBodyId)
        ? props.activeBodyId
        : activeHook.pinnedBodyId && bodies.some((b) => b.id === activeHook.pinnedBodyId)
        ? activeHook.pinnedBodyId
        : bodies[0].id;

    const post = new Post(
      {
        status: props.status ?? PostStatus.DRAFT,
        hooks,
        bodies,
        activeHookId,
        activeBodyId,
        variants: props.variants ?? [],
        activeVariantId: activeHookId,
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
