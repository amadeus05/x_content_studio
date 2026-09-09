import { IPostRepository, PostFilterCriteria } from "../domain/repositories/IPostRepository.ts";
import { Post } from "../domain/entities/Post.ts";
import { PostHook } from "../domain/entities/PostHook.ts";
import { PostBody } from "../domain/entities/PostBody.ts";
import { PostStatus } from "../domain/value-objects/PostStatus.ts";
import { IDatabase } from "../../../shared/infrastructure/db/D1Database.ts";

export class D1PostRepository implements IPostRepository {
  constructor(private readonly db: IDatabase) {}

  public async save(post: Post): Promise<void> {
    const postSql = `
      INSERT OR REPLACE INTO posts (
        id, status, active_variant_id, tags, notes, tweet_url, metrics, scheduled_for, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const postParams = [
      post.id,
      post.status.value,
      post.activeHookId,
      JSON.stringify(post.tags),
      post.notes,
      post.tweetUrl,
      JSON.stringify(post.metrics),
      post.scheduledFor ? post.scheduledFor.toISOString() : null,
      post.createdAt.toISOString(),
      post.updatedAt.toISOString()
    ];

    const variantSql = `
      INSERT OR REPLACE INTO post_variants (
        id, post_id, hook, body, variant_label, order_index, created_at, updated_at, pinned_body_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const bodySql = `
      INSERT OR REPLACE INTO post_bodies (
        id, post_id, text, body_label, order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const activeBody = post.getActiveBody();

    const statements: { sql: string; params?: unknown[] }[] = [
      { sql: postSql, params: postParams },
      { sql: "DELETE FROM post_variants WHERE post_id = ?", params: [post.id] },
      { sql: "DELETE FROM post_bodies WHERE post_id = ?", params: [post.id] },
      ...post.hooks.map((hook) => {
        let bodyText = activeBody ? activeBody.text : "";
        if (hook.pinnedBodyId) {
          const pinned = post.bodies.find((b) => b.id === hook.pinnedBodyId);
          if (pinned) bodyText = pinned.text;
        }

        return {
          sql: variantSql,
          params: [
            hook.id,
            hook.postId,
            hook.text,
            bodyText,
            hook.label,
            hook.orderIndex,
            hook.createdAt.toISOString(),
            hook.updatedAt.toISOString(),
            hook.pinnedBodyId ?? null
          ]
        };
      }),
      ...post.bodies.map((body) => ({
        sql: bodySql,
        params: [
          body.id,
          body.postId,
          body.text,
          body.label,
          body.orderIndex,
          body.createdAt.toISOString(),
          body.updatedAt.toISOString()
        ]
      }))
    ];

    await this.db.batch(statements);
  }

  public async findById(id: string): Promise<Post | null> {
    const postsRows = await this.db.query<any>("SELECT * FROM posts WHERE id = ?", [id]);
    const row = postsRows.find((r) => r.id === id);
    if (!row) return null;

    const variantsRows = await this.db.query<any>("SELECT * FROM post_variants WHERE post_id = ?", [id]);
    const bodiesRows = await this.db.query<any>("SELECT * FROM post_bodies WHERE post_id = ?", [id]);

    const hooks = variantsRows
      .filter((v) => v.post_id === id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((v) =>
        PostHook.create(
          {
            postId: v.post_id,
            text: v.hook,
            label: v.variant_label,
            pinnedBodyId: v.pinned_body_id ?? null,
            orderIndex: v.order_index,
            createdAt: new Date(v.created_at),
            updatedAt: new Date(v.updated_at)
          },
          v.id
        ).getValue()
      );

    const bodies = bodiesRows
      .filter((b) => b.post_id === id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((b) =>
        PostBody.create(
          {
            postId: b.post_id,
            text: b.text,
            label: b.body_label,
            orderIndex: b.order_index,
            createdAt: new Date(b.created_at),
            updatedAt: new Date(b.updated_at)
          },
          b.id
        ).getValue()
      );

    let parsedTags: string[] = [];
    try {
      parsedTags = typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags || [];
    } catch {
      parsedTags = [];
    }

    let parsedMetrics = {};
    try {
      parsedMetrics = typeof row.metrics === "string" ? JSON.parse(row.metrics) : row.metrics || {};
    } catch {
      parsedMetrics = {};
    }

    const statusRes = PostStatus.create(row.status);
    const status = statusRes.isSuccess ? statusRes.getValue() : PostStatus.DRAFT;

    const postRes = Post.create(
      {
        status,
        hooks,
        bodies,
        activeHookId: row.active_variant_id,
        tags: parsedTags,
        notes: row.notes || "",
        tweetUrl: row.tweet_url || "",
        metrics: parsedMetrics,
        scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      },
      row.id
    );

    return postRes.isSuccess ? postRes.getValue() : null;
  }

  public async findAll(criteria: PostFilterCriteria = {}): Promise<Post[]> {
    const allPostsRows = await this.db.query<any>("SELECT * FROM posts ORDER BY updated_at DESC");
    const allVariantsRows = await this.db.query<any>("SELECT * FROM post_variants");
    const allBodiesRows = await this.db.query<any>("SELECT * FROM post_bodies");

    const posts: Post[] = [];

    for (const row of allPostsRows) {
      const postHooks = allVariantsRows
        .filter((v) => v.post_id === row.id)
        .sort((a, b) => a.order_index - b.order_index)
        .map((v) =>
          PostHook.create(
            {
              postId: v.post_id,
              text: v.hook,
              label: v.variant_label,
              pinnedBodyId: v.pinned_body_id ?? null,
              orderIndex: v.order_index,
              createdAt: new Date(v.created_at),
              updatedAt: new Date(v.updated_at)
            },
            v.id
          ).getValue()
        );

      const postBodies = allBodiesRows
        .filter((b) => b.post_id === row.id)
        .sort((a, b) => a.order_index - b.order_index)
        .map((b) =>
          PostBody.create(
            {
              postId: b.post_id,
              text: b.text,
              label: b.body_label,
              orderIndex: b.order_index,
              createdAt: new Date(b.created_at),
              updatedAt: new Date(b.updated_at)
            },
            b.id
          ).getValue()
        );

      let parsedTags: string[] = [];
      try {
        parsedTags = typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags || [];
      } catch {
        parsedTags = [];
      }

      let parsedMetrics = {};
      try {
        parsedMetrics = typeof row.metrics === "string" ? JSON.parse(row.metrics) : row.metrics || {};
      } catch {
        parsedMetrics = {};
      }

      const statusRes = PostStatus.create(row.status);
      const status = statusRes.isSuccess ? statusRes.getValue() : PostStatus.DRAFT;

      const postRes = Post.create(
        {
          status,
          hooks: postHooks,
          bodies: postBodies,
          activeHookId: row.active_variant_id,
          tags: parsedTags,
          notes: row.notes || "",
          tweetUrl: row.tweet_url || "",
          metrics: parsedMetrics,
          scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : null,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        },
        row.id
      );

      if (postRes.isSuccess) {
        posts.push(postRes.getValue());
      }
    }

    // Фильтрация по критериям
    let filtered = posts;

    if (criteria.status) {
      filtered = filtered.filter((p) => p.status.value === criteria.status);
    }

    if (criteria.tag) {
      const targetTag = criteria.tag.toLowerCase();
      filtered = filtered.filter((p) => p.tags.some((t) => t.toLowerCase() === targetTag));
    }

    if (criteria.search) {
      const query = criteria.search.toLowerCase();
      filtered = filtered.filter((p) => {
        const hasInNotes = p.notes.toLowerCase().includes(query);
        const hasInTags = p.tags.some((t) => t.toLowerCase().includes(query));
        const hasInHooks = p.hooks.some((h) => h.text.toLowerCase().includes(query));
        const hasInBodies = p.bodies.some((b) => b.text.toLowerCase().includes(query));
        return hasInNotes || hasInTags || hasInHooks || hasInBodies;
      });
    }

    return filtered;
  }

  public async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM posts WHERE id = ?", [id]);
    await this.db.execute("DELETE FROM post_variants WHERE post_id = ?", [id]);
    await this.db.execute("DELETE FROM post_bodies WHERE post_id = ?", [id]);
  }

  public async getAllTags(): Promise<string[]> {
    const posts = await this.findAll();
    const tagSet = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }
}
