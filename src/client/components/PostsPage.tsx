import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PostDto } from "../../modules/content/application/dtos/PostDto.ts";
import { PostCard, NewPostCard } from "./PostCard.tsx";
import { StudioSelect } from "./StudioSelect.tsx";
import { TagFilter } from "./TagFilter.tsx";

const PAGE_SIZE = 12;

interface PostsPageProps {
  posts: PostDto[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilterStatus: string;
  onStatusFilterChange: (value: string) => void;
  statusFilters: Array<{ id: string; label: string; color: string }>;
  tags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onSelectPost: (id: string) => void;
  onDeletePost: (id: string, e: React.MouseEvent) => void;
  onCreatePost: () => void;
}

export const PostsPage: React.FC<PostsPageProps> = ({
  posts,
  loading,
  searchQuery,
  onSearchChange,
  activeFilterStatus,
  onStatusFilterChange,
  statusFilters,
  tags,
  selectedTags,
  onTagsChange,
  onSelectPost,
  onDeletePost,
  onCreatePost
}) => {
  const [page, setPage] = useState(1);

  const firstPagePosts = PAGE_SIZE - 1;
  const totalPages = useMemo(() => {
    if (posts.length <= firstPagePosts) return 1;
    return 1 + Math.ceil((posts.length - firstPagePosts) / PAGE_SIZE);
  }, [posts.length, firstPagePosts]);
  const safePage = Math.min(page, totalPages);

  const pagePosts = useMemo(() => {
    if (safePage === 1) return posts.slice(0, firstPagePosts);
    const start = firstPagePosts + (safePage - 2) * PAGE_SIZE;
    return posts.slice(start, start + PAGE_SIZE);
  }, [posts, safePage, firstPagePosts]);

  React.useEffect(() => {
    setPage(1);
  }, [activeFilterStatus, selectedTags, searchQuery, posts.length]);

  const showPagination = posts.length > firstPagePosts;

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-surface-950 overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-800 bg-surface-900/40 shrink-0">
        <div className="flex flex-wrap items-center gap-3 h-8">
          <div className="relative flex-1 min-w-[220px] max-w-md h-8">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск по постам… (Ctrl+K)"
              className="w-full h-8 pl-9 pr-12 text-xs bg-surface-950/80 border border-surface-750/70 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-surface-800 border border-surface-700 rounded">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3 shrink-0 h-8">
            <div className="h-8 flex items-center">
              <StudioSelect
                aria-label="Фильтр по статусу"
                value={activeFilterStatus}
                options={statusFilters}
                onChange={onStatusFilterChange}
              />
            </div>

            <div className="w-48 h-8">
              <TagFilter tags={tags} selected={selectedTags} onChange={onTagsChange} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 pt-3 pb-3">
        {loading && posts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Загрузка постов…</div>
        ) : (
          <>
            {/* Всегда 3 равных ряда: одна карточка = та же высота ячейки, что и при полной сетке */}
            <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid-rows-3 gap-3">
              {safePage === 1 && <NewPostCard onClick={onCreatePost} />}
              {pagePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onSelect={() => onSelectPost(post.id)}
                  onDelete={(e) => onDeletePost(post.id, e)}
                />
              ))}
            </div>

            <div className="shrink-0 flex items-center justify-center gap-3 h-[54px]">
              {showPagination ? (
                <>
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-750 bg-surface-900 text-slate-300 disabled:opacity-40 hover:bg-surface-850"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Назад
                  </button>
                  <span className="text-xs text-slate-400 font-mono">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-750 bg-surface-900 text-slate-300 disabled:opacity-40 hover:bg-surface-850"
                  >
                    Вперёд
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
