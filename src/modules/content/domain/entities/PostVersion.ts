import { Entity } from "../../../../shared/domain/Entity.ts";
import { Result } from "../../../../shared/domain/Result.ts";

export interface PostVersionProps {
  variantId: string;
  versionNumber: number;
  hook: string;
  body: string;
  createdAt: Date;
  actionMetadata?: string | null;
}

/**
 * Immutable entity representing a concrete revision (version) of a PostVariant.
 * Once created, a version is never mutated. New edits create new versions.
 */
export class PostVersion extends Entity<PostVersionProps> {
  private constructor(props: PostVersionProps, id?: string) {
    super(props, id);
  }

  get variantId(): string {
    return this.props.variantId;
  }

  get versionNumber(): number {
    return this.props.versionNumber;
  }

  get hook(): string {
    return this.props.hook;
  }

  get body(): string {
    return this.props.body;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get actionMetadata(): string | null | undefined {
    return this.props.actionMetadata;
  }

  public getFullText(): string {
    if (!this.props.hook) return this.props.body;
    if (!this.props.body) return this.props.hook;
    return `${this.props.hook}\n\n${this.props.body}`;
  }

  public static create(
    props: {
      variantId: string;
      versionNumber: number;
      hook?: string;
      body?: string;
      createdAt?: Date;
      actionMetadata?: string | null;
    },
    id?: string
  ): Result<PostVersion> {
    if (props.versionNumber < 1) {
      return Result.fail("versionNumber must be >= 1");
    }

    const version = new PostVersion(
      {
        variantId: props.variantId,
        versionNumber: props.versionNumber,
        hook: props.hook || "",
        body: props.body || "",
        createdAt: props.createdAt ?? new Date(),
        actionMetadata: props.actionMetadata ?? null
      },
      id ?? crypto.randomUUID()
    );

    return Result.ok(version);
  }
}
