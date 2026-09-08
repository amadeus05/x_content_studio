import { IPostRepository } from "../../domain/repositories/IPostRepository.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { PostDto, PostMapper } from "../dtos/PostDto.ts";

export interface AddPostVariantRequest {
  postId: string;
  hook?: string;
  body?: string;
  label?: string;
}

export class AddPostVariantUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(req: AddPostVariantRequest): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(req.postId);
    if (!post) {
      return Result.fail(`Пост с ID ${req.postId} не найден`);
    }

    const currentVariant = post.getActiveVariant();
    const hook = req.hook !== undefined ? req.hook : currentVariant.hook;
    const body = req.body !== undefined ? req.body : currentVariant.body;

    const variantRes = post.addVariant(hook, body, req.label);
    if (variantRes.isFailure) {
      return Result.fail(variantRes.getError());
    }

    // Автоматически делаем новый вариант активным
    const newVariant = variantRes.getValue();
    post.setActiveVariant(newVariant.id);

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}

export class SelectActiveVariantUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(postId: string, variantId: string): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.fail(`Пост с ID ${postId} не найден`);
    }

    const selectRes = post.setActiveVariant(variantId);
    if (selectRes.isFailure) {
      post.ensureVariant(variantId);
      const retry = post.setActiveVariant(variantId);
      if (retry.isFailure) {
        return Result.fail(retry.getError());
      }
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}

export class DeletePostVariantUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(postId: string, variantId: string): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return Result.fail(`Пост с ID ${postId} не найден`);
    }

    const delRes = post.removeVariant(variantId);
    if (delRes.isFailure) {
      return Result.fail(delRes.getError());
    }

    await this.postRepository.save(post);
    return Result.ok(PostMapper.toDto(post));
  }
}
