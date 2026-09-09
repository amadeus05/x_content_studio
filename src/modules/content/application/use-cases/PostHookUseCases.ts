import { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { PostDto, PostMapper } from "../dtos/PostDto.ts";

export interface AddPostHookRequest {
  postId: string;
  text?: string;
  label?: string;
  pinnedBodyId?: string | null;
}

export class AddPostHookUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(req: AddPostHookRequest): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail(`Пост с ID ${req.postId} не найден`);
    }

    const res = post.addHook(req.text || "", req.label, req.pinnedBodyId);
    if (res.isFailure) {
      return Result.fail(res.getError());
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}

export class SelectPostHookUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(postId: string, hookId: string): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.fail(`Пост с ID ${postId} не найден`);
    }

    const res = post.selectHook(hookId);
    if (res.isFailure) {
      return Result.fail(res.getError());
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}

export class UpdatePostHookUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(
    postId: string,
    hookId: string,
    data: { text?: string; label?: string }
  ): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.fail(`Пост с ID ${postId} не найден`);
    }

    const current = post.hooks.find((h) => h.id === hookId);
    if (!current) {
      return Result.fail(`Хук с ID ${hookId} не найден`);
    }

    const res = post.updateHook(
      hookId,
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

export class DeletePostHookUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(postId: string, hookId: string): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.fail(`Пост с ID ${postId} не найден`);
    }

    const res = post.removeHook(hookId);
    if (res.isFailure) {
      return Result.fail(res.getError());
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}

export class PinBodyToHookUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(
    postId: string,
    hookId: string,
    bodyId: string | null
  ): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.fail(`Пост с ID ${postId} не найден`);
    }

    const res = post.pinBodyToHook(hookId, bodyId);
    if (res.isFailure) {
      return Result.fail(res.getError());
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}
