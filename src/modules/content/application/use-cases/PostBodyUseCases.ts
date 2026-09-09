import { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { PostDto, PostMapper } from "../dtos/PostDto.ts";

export interface AddPostBodyRequest {
  postId: string;
  text?: string;
  label?: string;
}

export class AddPostBodyUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(req: AddPostBodyRequest): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail(`Пост с ID ${req.postId} не найден`);
    }

    const res = post.addBody(req.text || "", req.label);
    if (res.isFailure) {
      return Result.fail(res.getError());
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}

export class SelectPostBodyUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(postId: string, bodyId: string): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.fail(`Пост с ID ${postId} не найден`);
    }

    const res = post.selectBody(bodyId);
    if (res.isFailure) {
      return Result.fail(res.getError());
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}

export class UpdatePostBodyUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(
    postId: string,
    bodyId: string,
    data: { text?: string; label?: string }
  ): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.fail(`Пост с ID ${postId} не найден`);
    }

    const current = post.bodies.find((b) => b.id === bodyId);
    if (!current) {
      return Result.fail(`Тело поста с ID ${bodyId} не найдено`);
    }

    const res = post.updateBody(
      bodyId,
      data.text !== undefined ? data.text : current.text,
      data.label !== undefined ? data.label : current.label
    );

    if (res.isFailure) {
      return Result.fail(res.getError());
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}

export class DeletePostBodyUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(postId: string, bodyId: string): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.fail(`Пост с ID ${postId} не найден`);
    }

    const res = post.removeBody(bodyId);
    if (res.isFailure) {
      return Result.fail(res.getError());
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}
