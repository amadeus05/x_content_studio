import { Post } from "../../domain/entities/Post.ts";
import { PostVariant } from "../../domain/entities/PostVariant.ts";
import { PostHook } from "../../domain/entities/PostHook.ts";
import { PostBody } from "../../domain/entities/PostBody.ts";

export interface PostHookDto {
  id: string;
  postId: string;
  label: string;
  text: string;
  pinnedBodyId: string | null;
  orderIndex: number;
  charCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostBodyDto {
  id: string;
  postId: string;
  label: string;
  text: string;
  orderIndex: number;
  charCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostVariantDto {
  id: string;
  postId: string;
  hook: string;
  body: string;
  fullText: string;
  variantLabel: string;
  label?: string;
  pinnedBodyId?: string | null;
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
  activeHookId: string;
  activeBodyId: string;
  hooks: PostHookDto[];
  bodies: PostBodyDto[];
  activeHook: PostHookDto;
  activeBody: PostBodyDto;
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
  public static toHookDto(hook: PostHook): PostHookDto {
    return {
      id: hook.id,
      postId: hook.postId,
      label: hook.label,
      text: hook.text,
      pinnedBodyId: hook.pinnedBodyId ?? null,
      orderIndex: hook.orderIndex,
      charCount: [...hook.text].length,
      createdAt: hook.createdAt.toISOString(),
      updatedAt: hook.updatedAt.toISOString()
    };
  }

  public static toBodyDto(body: PostBody): PostBodyDto {
    return {
      id: body.id,
      postId: body.postId,
      label: body.label,
      text: body.text,
      orderIndex: body.orderIndex,
      charCount: [...body.text].length,
      createdAt: body.createdAt.toISOString(),
      updatedAt: body.updatedAt.toISOString()
    };
  }

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
      label: variant.variantLabel,
      pinnedBodyId: variant.pinnedBodyId ?? null,
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
    const hooksDto = post.hooks.map(PostMapper.toHookDto);
    const bodiesDto = post.bodies.map(PostMapper.toBodyDto);
    const activeHook = post.getActiveHook();
    const activeBody = post.getActiveBody();

    const variantsDto = post.variants.map(PostMapper.toVariantDto);
    const activeVariant = post.getActiveVariant();
    const activeDto = PostMapper.toVariantDto(activeVariant);

    return {
      id: post.id,
      status: post.status.value,
      statusLabel: post.status.label,
      statusBadgeColor: post.status.badgeColor,
      activeVariantId: post.activeVariantId,
      activeHookId: post.activeHookId,
      activeBodyId: post.activeBodyId,
      hooks: hooksDto,
      bodies: bodiesDto,
      activeHook: activeHook ? PostMapper.toHookDto(activeHook) : hooksDto[0],
      activeBody: activeBody ? PostMapper.toBodyDto(activeBody) : bodiesDto[0],
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
