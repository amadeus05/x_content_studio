import { Post } from "../entities/Post.ts";

export interface PostFilterCriteria {
  status?: string;
  search?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface IPostRepository {
  save(post: Post): Promise<void>;
  findById(id: string): Promise<Post | null>;
  findAll(criteria?: PostFilterCriteria): Promise<Post[]>;
  delete(id: string): Promise<void>;
  getAllTags(): Promise<string[]>;
}
