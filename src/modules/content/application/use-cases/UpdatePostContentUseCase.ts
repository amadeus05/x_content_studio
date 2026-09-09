import { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { PostDto, PostMapper } from "../dtos/PostDto.ts";
import { PostMetrics } from "../../domain/entities/Post.ts";

export interface UpdatePostContentRequest {
  postId: string;
  variantId?: string;
  hookId?: string;
  hook?: string;
  hookLabel?: string;
  bodyId?: string;
  body?: string;
  bodyLabel?: string;
  pinnedBodyId?: string | null;
  variantLabel?: string;
  tags?: string[];
  notes?: string;
  tweetUrl?: string;
  metrics?: PostMetrics;
}

export class UpdatePostContentUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(req: UpdatePostContentRequest): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail(`Пост с ID ${req.postId} не найден`);
    }

    const targetHookId = req.hookId || req.variantId || post.activeHookId;
    const targetHookLabel = req.hookLabel || req.variantLabel;

    if (req.hook !== undefined) {
      const hookRes = post.updateHook(targetHookId, req.hook, targetHookLabel);
      if (hookRes.isFailure) {
        post.addHook(req.hook, targetHookLabel, req.pinnedBodyId);
      }
    } else if (targetHookLabel !== undefined) {
      const currentHook = post.hooks.find((h) => h.id === targetHookId);
      if (currentHook) {
        post.updateHook(targetHookId, currentHook.text, targetHookLabel);
      }
    }

    if (req.pinnedBodyId !== undefined) {
      post.pinBodyToHook(targetHookId, req.pinnedBodyId);
    }

    const targetBodyId = req.bodyId || post.activeBodyId;
    if (req.body !== undefined) {
      const bodyRes = post.updateBody(targetBodyId, req.body, req.bodyLabel);
      if (bodyRes.isFailure) {
        post.addBody(req.body, req.bodyLabel);
      }
    } else if (req.bodyLabel !== undefined) {
      const currentBody = post.bodies.find((b) => b.id === targetBodyId);
      if (currentBody) {
        post.updateBody(targetBodyId, currentBody.text, req.bodyLabel);
      }
    }

    if (req.tags !== undefined) {
      // Заменяем теги
      const currentTags = [...post.tags];
      currentTags.forEach((t) => post.removeTag(t));
      req.tags.forEach((t) => post.addTag(t));
    }

    if (req.notes !== undefined) {
      post.updateNotes(req.notes);
    }

    if (req.tweetUrl !== undefined) {
      post.markAsPosted(req.tweetUrl, req.metrics);
    } else if (req.metrics !== undefined) {
      post.updateMetrics(req.metrics);
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}
