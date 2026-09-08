import { IPostRepository, PostFilterCriteria } from "../../domain/repositories/IPostRepository.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import { PostDto, PostMapper } from "../dtos/PostDto.ts";

export class SearchPostsUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(criteria: PostFilterCriteria = {}): Promise<Result<PostDto[]>> {
    const posts = await this.postRepository.findAll(criteria);
    const dtos = posts.map(PostMapper.toDto);
    return Result.ok(dtos);
  }
}

export class GetPostByIdUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(id: string): Promise<Result<PostDto>> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      return Result.fail(`Пост с ID ${id} не найден`);
    }
    return Result.ok(PostMapper.toDto(post));
  }
}

export class DeletePostUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(id: string): Promise<Result<void>> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      return Result.fail(`Пост с ID ${id} не найден`);
    }
    await this.postRepository.delete(id);
    return Result.ok();
  }
}

export class GetAllTagsUseCase {
  constructor(private readonly postRepository: IPostRepository) {}

  public async execute(): Promise<Result<string[]>> {
    const tags = await this.postRepository.getAllTags();
    return Result.ok(tags);
  }
}
