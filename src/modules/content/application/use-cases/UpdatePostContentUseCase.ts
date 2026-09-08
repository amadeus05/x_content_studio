import { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { PostDto, PostMapper } from "../dtos/PostDto.ts";
import { PostMetrics } from "../../domain/entities/Post.ts";

export interface UpdatePostContentRequest {
  postId: string;
  variantId?: string;
  hook?: string;
  body?: string;
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

    let targetVariant = req.variantId
      ? post.variants.find((v) => v.id === req.variantId)
      : post.getActiveVariant();

    if (!targetVariant && req.variantId) {
      targetVariant = post.ensureVariant(req.variantId, req.hook ?? "", req.body ?? "");
    }

    if (!targetVariant) {
      targetVariant = post.ensureVariant(
        post.activeVariantId || crypto.randomUUID(),
        req.hook ?? "",
        req.body ?? ""
      );
    }

    if (req.hook !== undefined || req.body !== undefined) {
      targetVariant.updateContent(
        req.hook !== undefined ? req.hook : targetVariant.hook,
        req.body !== undefined ? req.body : targetVariant.body
      );
    }

    if (req.variantLabel !== undefined) {
      targetVariant.updateLabel(req.variantLabel);
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
