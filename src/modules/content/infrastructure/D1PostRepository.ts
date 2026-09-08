import { IPostRepository, PostFilterCriteria } from "../domain/repositories/IPostRepository.ts";
import { Post } from "../domain/entities/Post.ts";
import { PostVariant } from "../domain/entities/PostVariant.ts";
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
      post.activeVariantId,
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
        id, post_id, hook, body, variant_label, order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const statements: { sql: string; params?: unknown[] }[] = [
      { sql: postSql, params: postParams },
      ...post.variants.map((variant) => ({
        sql: variantSql,
        params: [
          variant.id,
          variant.postId,
          variant.hook,
          variant.body,
          variant.variantLabel,
          variant.orderIndex,
          variant.createdAt.toISOString(),
          variant.updatedAt.toISOString()
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
    const variants = variantsRows
      .filter((v) => v.post_id === id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((v) =>
        PostVariant.create(
          {
            postId: v.post_id,
            hook: v.hook,
            body: v.body,
            variantLabel: v.variant_label,
            orderIndex: v.order_index,
            createdAt: new Date(v.created_at),
            updatedAt: new Date(v.updated_at)
          },
          v.id
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
        variants,
        activeVariantId: row.active_variant_id,
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

    const posts: Post[] = [];

    for (const row of allPostsRows) {
      const postVariants = allVariantsRows
        .filter((v) => v.post_id === row.id)
        .sort((a, b) => a.order_index - b.order_index)
        .map((v) =>
          PostVariant.create(
            {
              postId: v.post_id,
              hook: v.hook,
              body: v.body,
              variantLabel: v.variant_label,
              orderIndex: v.order_index,
              createdAt: new Date(v.created_at),
              updatedAt: new Date(v.updated_at)
            },
            v.id
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
          variants: postVariants,
          activeVariantId: row.active_variant_id,
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
        const hasInVariants = p.variants.some(
          (v) => v.hook.toLowerCase().includes(query) || v.body.toLowerCase().includes(query)
        );
        return hasInNotes || hasInTags || hasInVariants;
      });
    }

    return filtered;
  }

  public async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM posts WHERE id = ?", [id]);
    await this.db.execute("DELETE FROM post_variants WHERE post_id = ?", [id]);
  }

  public async getAllTags(): Promise<string[]> {
    const posts = await this.findAll();
    const tagSet = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }
}
