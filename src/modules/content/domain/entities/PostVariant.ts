import { Entity } from "../../../../shared/domain/Entity.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { TweetContent } from "../value-objects/TweetContent.ts";
import { PostVersion } from "./PostVersion.ts";

export interface PostVariantProps {
  postId: string;
  label: string;
  orderIndex: number;
  activeVersionId: string;
  versions: PostVersion[];
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

  get label(): string {
    return this.props.label;
  }

  /** Backward-compatible alias for label */
  get variantLabel(): string {
    return this.props.label;
  }

  get orderIndex(): number {
    return this.props.orderIndex;
  }

  get activeVersionId(): string {
    return this.props.activeVersionId;
  }

  get pinnedBodyId(): string | null | undefined {
    return this.props.pinnedBodyId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Returns active version's hook text, or empty string.
   */
  get hook(): string {
    return this.getActiveVersion()?.hook || "";
  }

  /**
   * Returns active version's body text, or empty string.
   */
  get body(): string {
    return this.getActiveVersion()?.body || "";
  }

  public getVersions(): PostVersion[] {
    return [...this.props.versions].sort((a, b) => a.versionNumber - b.versionNumber);
  }

  public getActiveVersion(): PostVersion | undefined {
    const found = this.props.versions.find((v) => v.id === this.props.activeVersionId);
    if (found) return found;
    // Fallback to highest version number or first
    const sorted = this.getVersions();
    return sorted[sorted.length - 1];
  }

  public selectVersion(versionId: string): Result<void> {
    const version = this.props.versions.find((v) => v.id === versionId);
    if (!version) {
      return Result.fail(`Версия с ID ${versionId} не найдена в варианте ${this.id}`);
    }

    this.props.activeVersionId = version.id;
    this.props.updatedAt = new Date();
    return Result.ok();
  }

  public addVersion(hook: string, body: string, actionMetadata?: string): Result<PostVersion> {
    const nextNumber =
      this.props.versions.length > 0
        ? Math.max(...this.props.versions.map((v) => v.versionNumber)) + 1
        : 1;

    const versionRes = PostVersion.create({
      variantId: this.id,
      versionNumber: nextNumber,
      hook,
      body,
      actionMetadata
    });

    if (versionRes.isFailure) {
      return Result.fail(versionRes.getError());
    }

    const version = versionRes.getValue();
    this.props.versions.push(version);
    this.props.activeVersionId = version.id;
    this.props.updatedAt = new Date();

    return Result.ok(version);
  }

  public getFullText(): string {
    const active = this.getActiveVersion();
    return active ? active.getFullText() : "";
  }

  public getTweetContent(): TweetContent {
    return TweetContent.create(this.getFullText()).getValue();
  }

  public updateLabel(label: string): void {
    this.props.label = label.trim() || "Вариант";
    this.props.updatedAt = new Date();
  }

  public setPinnedBody(bodyId: string | null): void {
    this.props.pinnedBodyId = bodyId || null;
    this.props.updatedAt = new Date();
  }

  public static create(
    props: {
      postId: string;
      label?: string;
      variantLabel?: string;
      orderIndex?: number;
      activeVersionId?: string;
      versions?: PostVersion[];
      hook?: string;
      body?: string;
      pinnedBodyId?: string | null;
      createdAt?: Date;
      updatedAt?: Date;
    },
    id?: string
  ): Result<PostVariant> {
    const now = new Date();
    const variantId = id ?? crypto.randomUUID();
    const versions: PostVersion[] = props.versions ? [...props.versions] : [];

    // If no versions were explicitly provided, create Version 1 from hook and body
    if (versions.length === 0 && (props.hook !== undefined || props.body !== undefined)) {
      const v1Res = PostVersion.create({
        variantId,
        versionNumber: 1,
        hook: props.hook || "",
        body: props.body || "",
        actionMetadata: "initial"
      });
      if (v1Res.isSuccess) {
        versions.push(v1Res.getValue());
      }
    }

    const activeVersionId =
      props.activeVersionId && versions.some((v) => v.id === props.activeVersionId)
        ? props.activeVersionId
        : versions[0]?.id || "";

    const variant = new PostVariant(
      {
        postId: props.postId,
        label: props.label || props.variantLabel || `Вариант ${(props.orderIndex ?? 0) + 1}`,
        orderIndex: props.orderIndex ?? 0,
        activeVersionId,
        versions,
        pinnedBodyId: props.pinnedBodyId ?? null,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now
      },
      variantId
    );

    return Result.ok(variant);
  }
}
