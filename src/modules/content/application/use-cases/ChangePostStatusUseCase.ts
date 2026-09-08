import { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { PostStatus } from "../../domain/value-objects/PostStatus.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { PostDto, PostMapper } from "../dtos/PostDto.ts";

export interface ChangePostStatusRequest {
  postId: string;
  status: string;
}

export class ChangePostStatusUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(req: ChangePostStatusRequest): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail(`Пост с ID ${req.postId} не найден`);
    }

    const nextStatusRes = PostStatus.create(req.status);
    if (nextStatusRes.isFailure) {
      return Result.fail(nextStatusRes.getError());
    }

    const transitionRes = post.changeStatus(nextStatusRes.getValue());
    if (transitionRes.isFailure) {
      return Result.fail(transitionRes.getError());
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}
