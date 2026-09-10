import { IPostRepository, PostFilterCriteria } from "../domain/repositories/IPostRepository.ts";
import { Post } from "../domain/entities/Post.ts";
import { PostVariant } from "../domain/entities/PostVariant.ts";
import { PostVersion } from "../domain/entities/PostVersion.ts";
import { PostHook } from "../domain/entities/PostHook.ts";
import { PostBody } from "../domain/entities/PostBody.ts";
import { PostStatus } from "../domain/value-objects/PostStatus.ts";
import { IDatabase } from "../../../shared/infrastructure/db/D1Database.ts";

type VariantRow = {
  id: string;
  post_id: string;
  label?: string;
  variant_label?: string;
  order_index: number;
  active_version_id?: string | null;
  hook?: string;
  body?: string;
  pinned_body_id?: string | null;
  created_at: string;
  updated_at: string;
};

type VersionRow = {
  id: string;
  variant_id: string;
  version_number: number;
  hook: string;
  body: string;
  created_at: string;
  action_metadata?: string | null;
};

type BodyRow = {
  id: string;
  post_id: string;
  text: string;
  body_label: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export class D1PostRepository implements IPostRepository {
  constructor(private readonly db: IDatabase) {}

  public async save(post: Post): Promise<void> {
    const postSql = `
      INSERT OR REPLACE INTO posts (
        id, status, active_variant_id, active_body_id, tags, notes, tweet_url, metrics, scheduled_for, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const postParams = [
      post.id,
      post.status.value,
      post.activeVariantId,
      post.activeBodyId,
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
        id, post_id, label, variant_label, order_index, active_version_id, hook, body, pinned_body_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const versionSql = `
      INSERT OR REPLACE INTO post_versions (
        id, variant_id, version_number, hook, body, created_at, action_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const bodySql = `
      INSERT OR REPLACE INTO post_bodies (
        id, post_id, text, body_label, order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const statements: { sql: string; params?: unknown[] }[] = [
      { sql: postSql, params: postParams },
      { sql: "DELETE FROM post_variants WHERE post_id = ?", params: [post.id] },
      { sql: "DELETE FROM post_bodies WHERE post_id = ?", params: [post.id] },
      ...post.variants.map((v) => ({
        sql: variantSql,
        params: [
          v.id,
          v.postId,
          v.label,
          v.label,
          v.orderIndex,
          v.activeVersionId,
          v.hook,
          v.body,
          v.pinnedBodyId ?? null,
          v.createdAt.toISOString(),
          v.updatedAt.toISOString()
        ]
      })),
      ...post.variants.flatMap((v) =>
        v.getVersions().map((ver) => ({
          sql: versionSql,
          params: [
            ver.id,
            ver.variantId,
            ver.versionNumber,
            ver.hook,
            ver.body,
            ver.createdAt.toISOString(),
            ver.actionMetadata ?? null
          ]
        }))
      ),
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

    const variantsRows = await this.db.query<VariantRow>("SELECT * FROM post_variants WHERE post_id = ?", [id]);
    const versionsRows = await this.db.query<VersionRow>("SELECT * FROM post_versions");
    const bodiesRows = await this.db.query<BodyRow>("SELECT * FROM post_bodies WHERE post_id = ?", [id]);

    return this.mapPostRow(row, variantsRows, versionsRows, bodiesRows);
  }

  public async findAll(criteria: PostFilterCriteria = {}): Promise<Post[]> {
    const allPostsRows = await this.db.query<any>("SELECT * FROM posts ORDER BY updated_at DESC");
    const allVariantsRows = await this.db.query<VariantRow>("SELECT * FROM post_variants");
    const allVersionsRows = await this.db.query<VersionRow>("SELECT * FROM post_versions");
    const allBodiesRows = await this.db.query<BodyRow>("SELECT * FROM post_bodies");

    const posts: Post[] = [];

    for (const row of allPostsRows) {
      const postVariantsRows = allVariantsRows.filter((v) => v.post_id === row.id);
      const post = this.mapPostRow(row, postVariantsRows, allVersionsRows, allBodiesRows);
      if (post) posts.push(post);
    }

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
        const hasInVariants = p.variants.some((v) =>
          v.getVersions().some((ver) => ver.hook.toLowerCase().includes(query) || ver.body.toLowerCase().includes(query))
        );
        return hasInNotes || hasInTags || hasInVariants;
      });
    }

    return filtered;
  }

  public async delete(id: string): Promise<void> {
    const variants = await this.db.query<VariantRow>("SELECT * FROM post_variants WHERE post_id = ?", [id]);
    for (const v of variants) {
      await this.db.execute("DELETE FROM post_versions WHERE variant_id = ?", [v.id]);
    }
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

  private mapPostRow(
    row: any,
    variantsRows: VariantRow[],
    versionsRows: VersionRow[],
    bodiesRows: BodyRow[]
  ): Post | null {
    const sortedVariantRows = [...variantsRows].sort((a, b) => a.order_index - b.order_index);

    const variants: PostVariant[] = sortedVariantRows.map((vr) => {
      const vVersions = versionsRows
        .filter((ver) => ver.variant_id === vr.id)
        .sort((a, b) => a.version_number - b.version_number)
        .map((ver) =>
          PostVersion.create(
            {
              variantId: vr.id,
              versionNumber: ver.version_number,
              hook: ver.hook,
              body: ver.body,
              createdAt: new Date(ver.created_at),
              actionMetadata: ver.action_metadata ?? null
            },
            ver.id
          ).getValue()
        );

      return PostVariant.create(
        {
          postId: vr.post_id,
          label: vr.label || vr.variant_label || `Вариант ${vr.order_index + 1}`,
          orderIndex: vr.order_index,
          activeVersionId: vr.active_version_id || undefined,
          versions: vVersions,
          hook: vr.hook || "",
          body: vr.body || "",
          pinnedBodyId: vr.pinned_body_id ?? null,
          createdAt: new Date(vr.created_at),
          updatedAt: new Date(vr.updated_at)
        },
        vr.id
      ).getValue();
    });

    const hooks = sortedVariantRows.map((v) =>
      PostHook.create(
        {
          postId: v.post_id,
          text: v.hook || "",
          label: v.variant_label || v.label || `Хук ${v.order_index + 1}`,
          pinnedBodyId: v.pinned_body_id ?? null,
          orderIndex: v.order_index,
          createdAt: new Date(v.created_at),
          updatedAt: new Date(v.updated_at)
        },
        v.id
      ).getValue()
    );

    const bodies = bodiesRows
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
        variants,
        activeVariantId: row.active_variant_id,
        hooks,
        bodies,
        activeHookId: row.active_variant_id,
        activeBodyId: row.active_body_id ?? undefined,
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
}
