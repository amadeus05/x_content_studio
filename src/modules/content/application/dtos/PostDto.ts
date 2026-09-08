import { Post } from "../../domain/entities/Post.ts";
import { PostVariant } from "../../domain/entities/PostVariant.ts";

export interface PostVariantDto {
  id: string;
  postId: string;
  hook: string;
  body: string;
  fullText: string;
  variantLabel: string;
  orderIndex: number;
  charCount: number;
  remainingChars: number;
  isOverLimit: boolean;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostDto {
  id: string;
  status: string;
  statusLabel: string;
  statusBadgeColor: string;
  activeVariantId: string;
  variants: PostVariantDto[];
  activeVariant: PostVariantDto;
  tags: string[];
  notes: string;
  tweetUrl: string;
  metrics: {
    impressions?: number;
    likes?: number;
    retweets?: number;
    replies?: number;
    bookmarks?: number;
  };
  scheduledFor?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class PostMapper {
  public static toVariantDto(variant: PostVariant): PostVariantDto {
    const tweetContent = variant.getTweetContent();
    const countInfo = tweetContent.getCountInfo();

    return {
      id: variant.id,
      postId: variant.postId,
      hook: variant.hook,
      body: variant.body,
      fullText: variant.getFullText(),
      variantLabel: variant.variantLabel,
      orderIndex: variant.orderIndex,
      charCount: countInfo.totalChars,
      remainingChars: countInfo.remainingChars,
      isOverLimit: countInfo.isOverLimit,
      isPremium: countInfo.isPremiumLongForm,
      createdAt: variant.createdAt.toISOString(),
      updatedAt: variant.updatedAt.toISOString()
    };
  }

  public static toDto(post: Post): PostDto {
    const variantsDto = post.variants.map(PostMapper.toVariantDto);
    const activeVariant = post.getActiveVariant();
    const activeDto = PostMapper.toVariantDto(activeVariant);

    return {
      id: post.id,
      status: post.status.value,
      statusLabel: post.status.label,
      statusBadgeColor: post.status.badgeColor,
      activeVariantId: post.activeVariantId,
      variants: variantsDto,
      activeVariant: activeDto,
      tags: post.tags,
      notes: post.notes,
      tweetUrl: post.tweetUrl,
      metrics: post.metrics,
      scheduledFor: post.scheduledFor ? post.scheduledFor.toISOString() : null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  }
}
