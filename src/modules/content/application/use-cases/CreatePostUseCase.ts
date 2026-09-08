import { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { Post } from "../../domain/entities/Post.ts";
import { PostStatus } from "../../domain/value-objects/PostStatus.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { PostDto, PostMapper } from "../dtos/PostDto.ts";

export interface CreatePostRequest {
  initialHook?: string;
  initialBody?: string;
  status?: string;
  tags?: string[];
  notes?: string;
}

export class CreatePostUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(req: CreatePostRequest): Promise<Result<PostDto>> {
    let initialStatus = PostStatus.DRAFT;
    if (req.status) {
      const statusRes = PostStatus.create(req.status);
      if (statusRes.isFailure) {
        return Result.fail(statusRes.getError());
      }
      initialStatus = statusRes.getValue();
    }

    const postRes = Post.create({
      status: initialStatus,
      initialHook: req.initialHook,
      initialBody: req.initialBody,
      tags: req.tags,
      notes: req.notes
    });

    if (postRes.isFailure) {
      return Result.fail(postRes.getError());
    }

    const post = postRes.getValue();
    await this.postRepository.save(post);

    return Result.ok(PostMapper.toDto(post));
  }
}
