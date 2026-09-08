import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Search,
  BookOpen,
  Settings,
  ChevronDown,
  ExternalLink,
  Info
} from "lucide-react";
import { ApiClient } from "./services/ApiClient.ts";
import { PostDto } from "../modules/content/application/dtos/PostDto.ts";
import { MethodologyDto, ToneProfileDto } from "../modules/playbook/application/use-cases/GetPlaybookUseCase.ts";
import { TwitterPreview } from "./components/TwitterPreview.tsx";
import { VariantTabs } from "./components/VariantTabs.tsx";
import { PlaybookModal } from "./components/PlaybookModal.tsx";
import { AiCopilotPanel } from "./components/AiCopilotPanel.tsx";
import { PostCard } from "./components/PostCard.tsx";
import { SettingsModal } from "./components/SettingsModal.tsx";
import { TagEditor } from "./components/TagEditor.tsx";
import { TagFilter } from "./components/TagFilter.tsx";
import { MediaGallery, PreviewMedia } from "./components/MediaGallery.tsx";
import { useFeedback } from "./components/Feedback.tsx";

export const App: React.FC = () => {
  const feedback = useFeedback();
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [activeFilterStatus, setActiveFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Playbook & Tone
  const [methodologies, setMethodologies] = useState<MethodologyDto[]>([]);
  const [toneProfile, setToneProfile] = useState<ToneProfileDto>({
    id: "default",
    name: "Мой стиль",
    rules: [],
    avoidWords: [],
    targetAudience: ""
  });
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia[]>([]);
  const handlePreviewMedia = useCallback((items: PreviewMedia[]) => {
    setPreviewMedia(items);
  }, []);

  // User profile for preview
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("xm_user_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      name: "Алексей | X Creator",
      handle: "alex_content",
      avatarUrl: ""
    };
  });

  // Загрузка постов и методик
  const loadPosts = async () => {
    try {
      const data = await ApiClient.getPosts({
        status: activeFilterStatus,
        search: searchQuery
      });
      const visible =
        selectedTags.length > 0
          ? data.filter((p) => selectedTags.every((tag) => p.tags.includes(tag)))
          : data;
      setPosts(visible);
      if (visible.length > 0 && !selectedPostId) {
        setSelectedPostId(visible[0].id);
      }
    } catch (err: any) {
      console.error("Error loading posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaybook = async () => {
    try {
      const data = await ApiClient.getPlaybook();
      setMethodologies(data.methodologies);
      setToneProfile(data.toneProfile);
    } catch (err: any) {
      console.error("Error loading playbook:", err);
    }
  };

  const loadTags = async () => {
    try {
      const allTags = await ApiClient.getTags();
      setTags(allTags);
    } catch (err: any) {
      console.error("Error loading tags:", err);
    }
  };

  useEffect(() => {
    loadPosts();
    loadPlaybook();
    loadTags();
  }, [activeFilterStatus, selectedTags]);

  // Хоткей для создания поста (N) и поиска (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const selectedPost = posts.find((p) => p.id === selectedPostId) || posts[0];
  const activeVariant = selectedPost?.activeVariant;

  // Создание нового черновика
  const handleCreatePost = async () => {
    try {
      const newPost = await ApiClient.createPost({
        initialHook: "",
        initialBody: "",
        status: "DRAFT"
      });
      if (activeFilterStatus !== "ALL" && activeFilterStatus !== "DRAFT") {
        setActiveFilterStatus("ALL");
      }
      setPosts([newPost, ...posts.filter((p) => p.id !== newPost.id)]);
      setSelectedPostId(newPost.id);
    } catch (err: any) {
      feedback.error("Не удалось создать черновик", err);
    }
  };

  // Удаление поста
  const handleDeletePost = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ok = await feedback.confirm({
      title: "Удалить черновик?",
      message: "Пост и все его варианты будут удалены без восстановления.",
      confirmLabel: "Удалить"
    });
    if (!ok) return;
    try {
      await ApiClient.deletePost(id);
      const updated = posts.filter((p) => p.id !== id);
      setPosts(updated);
      if (selectedPostId === id) {
        setSelectedPostId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err: any) {
      feedback.error("Не удалось удалить черновик", err);
    }
  };

  // Изменение контента активного варианта (hook / body)
  const handleContentChange = (newHook: string, newBody: string) => {
    if (!selectedPost || !activeVariant) return;

    const updatedVariants = selectedPost.variants.map((v) =>
      v.id === activeVariant.id
        ? {
            ...v,
            hook: newHook,
            body: newBody,
            fullText: newHook ? `${newHook}\n\n${newBody}` : newBody,
            charCount: [...(newHook ? `${newHook}\n\n${newBody}` : newBody)].length,
            remainingChars: 280 - [...(newHook ? `${newHook}\n\n${newBody}` : newBody)].length,
            isOverLimit: [...(newHook ? `${newHook}\n\n${newBody}` : newBody)].length > 280
          }
        : v
    );

    const updatedPost = {
      ...selectedPost,
      variants: updatedVariants,
      activeVariant: updatedVariants.find((v) => v.id === activeVariant.id)!
    };

    setPosts(posts.map((p) => (p.id === selectedPost.id ? updatedPost : p)));

    const postId = selectedPost.id;
    const variantId = activeVariant.id;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      ApiClient.updatePost(postId, {
        variantId,
        hook: newHook,
        body: newBody
      }).catch((err: any) => {
        console.error("Save error:", err);
      });
    }, 400);
  };

  // Смена статуса (FSM проверка)
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedPost) return;
    try {
      const updated = await ApiClient.changeStatus(selectedPost.id, newStatus);
      setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      feedback.error("Не удалось сменить статус", err);
    }
  };

  // Добавление нового варианта хука
  const handleAddVariant = async (label?: string) => {
    if (!selectedPost) return;
    try {
      const updated = await ApiClient.addVariant(selectedPost.id, {
        label: label || `Вариант ${selectedPost.variants.length + 1}`
      });
      setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      feedback.error("Не удалось добавить вариант", err);
    }
  };

  // Выбор активного варианта
  const handleSelectVariant = async (variantId: string) => {
    if (!selectedPost) return;
    try {
      const updated = await ApiClient.selectVariant(selectedPost.id, variantId);
      setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      console.error("Select variant error:", err);
    }
  };

  // Удаление варианта
  const handleDeleteVariant = async (variantId: string) => {
    if (!selectedPost) return;
    try {
      const updated = await ApiClient.deleteVariant(selectedPost.id, variantId);
      setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      feedback.error("Не удалось удалить вариант", err);
    }
  };

  // Изменение тегов поста
  const handleTagsChange = async (newTags: string[]) => {
    if (!selectedPost) return;
    setPosts(
      posts.map((p) => (p.id === selectedPost.id ? { ...p, tags: newTags } : p))
    );
    try {
      await ApiClient.updatePost(selectedPost.id, { tags: newTags });
      loadTags();
    } catch (err: any) {
      console.error("Tags save error:", err);
    }
  };

  // Вставка шаблона из методик
  const handleInsertTemplate = (template: string) => {
    if (!selectedPost || !activeVariant) return;
    const lines = template.split("\n\n");
    const hook = lines[0] || "";
    const body = lines.slice(1).join("\n\n");
    handleContentChange(hook, body);
  };

  // Отметка как опубликованный
  const handleMarkPosted = async (tweetUrl?: string) => {
    if (!selectedPost) return;
    try {
      await ApiClient.updatePost(selectedPost.id, {
        tweetUrl: tweetUrl || "",
        metrics: {}
      });
      const posted = await ApiClient.changeStatus(selectedPost.id, "POSTED");
      setPosts(posts.map((p) => (p.id === posted.id ? posted : p)));
    } catch (err: any) {
      feedback.error("Не удалось отметить публикацию", err);
    }
  };

  const wrapBody = (before: string, after: string) => {
    if (!selectedPost || !activeVariant) return;
    const el = bodyRef.current;
    const value = activeVariant.body;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || (after ? "текст" : "");
    handleContentChange(activeVariant.hook, value.slice(0, start) + before + selected + after + value.slice(end));
  };

  const applyBodyList = () => {
    if (!selectedPost || !activeVariant) return;
    const el = bodyRef.current;
    const value = activeVariant.body;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? value.length;
    const block = (start === end ? value : value.slice(start, end)) || value;
    const listed = block
      .split("\n")
      .map((line) => (line.startsWith("- ") || !line.trim() ? line : `- ${line}`))
      .join("\n");
    const next = start === end ? listed : value.slice(0, start) + listed + value.slice(end);
    handleContentChange(activeVariant.hook, next);
  };

  const statusFilters = [
    { id: "ALL", label: "Все статусы", color: "text-slate-200" },
    { id: "IDEA", label: "💡 Идея", color: "text-sky-400" },
    { id: "DRAFT", label: "🔥 Черновик", color: "text-amber-400" },
    { id: "AI_REVIEW", label: "👀 На ревью", color: "text-ai-400" },
    { id: "READY", label: "🚀 Готов", color: "text-brand-400" },
    { id: "POSTED", label: "📅 Запощен", color: "text-emerald-400" },
    { id: "ARCHIVED", label: "📦 Архив", color: "text-slate-500" }
  ];
  const activeStatusFilter = statusFilters.find((s) => s.id === activeFilterStatus) || statusFilters[0];

  const profileInitials = (() => {
    const parts = userProfile.name.replace(/\|/g, " ").split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase();
    return (userProfile.handle || "X").slice(0, 2).toUpperCase();
  })();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-950">
      {/* Top Navbar */}
      <header className="h-14 border-b border-surface-800 bg-surface-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0 select-none">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-bold text-base">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white tracking-tight text-sm">X Content Studio</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/30">
                PRO
              </span>
            </div>
          </div>

          <div className="relative w-72 hidden md:block">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                loadPosts();
              }}
              placeholder="Полнотекстовый поиск... (Ctrl+K)"
              className="w-full pl-9 pr-12 py-1.5 text-xs bg-surface-950/80 border border-surface-750/70 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-surface-800 border border-surface-700 rounded">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsPlaybookOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-surface-850 hover:bg-surface-800 border border-surface-750 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-brand-400" />
            <span>Методики & ToV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-surface-850 border border-transparent hover:border-surface-750 transition-colors"
            title="Настройки студии"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-surface-800" />

          <button
            type="button"
            onClick={handleCreatePost}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Новый черновик</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title={userProfile.name}
            className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-500 to-ai-500 p-[1px] cursor-pointer shrink-0"
          >
            <div className="w-full h-full rounded-full bg-surface-900 flex items-center justify-center font-bold text-[11px] text-white overflow-hidden">
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                profileInitials
              )}
            </div>
          </button>
        </div>
      </header>

      {/* Main Workspace (3 columns) */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-surface-800 bg-surface-900/60 flex flex-col shrink-0">
          <div className="p-3 border-b border-surface-800/80 space-y-2">
            <div className="relative">
              <label className="sr-only" htmlFor="list-status-filter">
                Фильтр по статусу
              </label>
              <select
                id="list-status-filter"
                value={activeFilterStatus}
                onChange={(e) => setActiveFilterStatus(e.target.value)}
                className={`appearance-none w-full h-8 bg-surface-850 hover:bg-surface-800 border border-surface-750 text-xs font-semibold rounded-lg pl-2.5 pr-8 leading-none focus:outline-none focus:border-brand-500 cursor-pointer ${activeStatusFilter.color}`}
              >
                {statusFilters.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            <TagFilter tags={tags} selected={selectedTags} onChange={setSelectedTags} />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                {loading ? "Загрузка черновиков..." : "Нет постов в этом разделе. Нажмите «Новый черновик»."}
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isSelected={post.id === selectedPostId}
                  onSelect={() => setSelectedPostId(post.id)}
                  onDelete={(e) => handleDeletePost(post.id, e)}
                />
              ))
            )}
          </div>

          <div className="p-2.5 border-t border-surface-800 bg-surface-950/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Синхронизировано с X</span>
            </span>
            <span className="font-mono text-[10px]">v1.0</span>
          </div>
        </aside>

        {selectedPost && activeVariant ? (
          <main className="flex-1 flex flex-col min-w-0 bg-surface-950 overflow-y-auto">
            <div className="px-6 py-3 border-b border-surface-800 bg-surface-900/40 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <label className="sr-only" htmlFor="post-status">
                    Статус поста
                  </label>
                  <select
                    id="post-status"
                    value={selectedPost.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`appearance-none h-8 bg-surface-850 hover:bg-surface-800 border border-surface-750 text-xs font-semibold rounded-lg pl-2.5 pr-8 leading-none focus:outline-none focus:border-brand-500 cursor-pointer ${
                      selectedPost.status === "POSTED"
                        ? "text-emerald-400"
                        : selectedPost.status === "READY"
                          ? "text-brand-400"
                          : selectedPost.status === "AI_REVIEW"
                            ? "text-ai-400"
                            : selectedPost.status === "ARCHIVED"
                              ? "text-slate-500"
                              : "text-amber-400"
                    }`}
                  >
                    <option value="IDEA">💡 Идея</option>
                    <option value="DRAFT">🔥 Черновик</option>
                    <option value="AI_REVIEW">👀 На ревью</option>
                    <option value="READY">🚀 Готов к публикации</option>
                    <option value="POSTED">📅 Запощен</option>
                    <option value="ARCHIVED">📦 Архив</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
                <TagEditor tags={selectedPost.tags} onChangeTags={handleTagsChange} />
              </div>
              <div className="flex items-center space-x-2 bg-surface-900 px-3 py-1 rounded-lg border border-surface-800">
                <span className="text-xs text-slate-400">Лимит символов:</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-200">{activeVariant.charCount}</span>
                  <span className="text-xs text-slate-500">/ 280</span>
                  <svg className="w-4 h-4 -rotate-90 text-brand-500" viewBox="0 0 36 36">
                    <path
                      className="text-surface-800"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className={
                        activeVariant.isOverLimit
                          ? "text-rose-500"
                          : activeVariant.remainingChars <= 20
                            ? "text-amber-400"
                            : "text-brand-500"
                      }
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${Math.min(100, (activeVariant.charCount / 280) * 100)}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="p-6 max-w-4xl w-full mx-auto space-y-6">

              {/* Hook Variants Tabs */}
              <VariantTabs
                variants={selectedPost.variants}
                activeVariantId={activeVariant.id}
                onSelectVariant={handleSelectVariant}
                onAddVariant={handleAddVariant}
                onDeleteVariant={handleDeleteVariant}
                onUpdateLabel={async (variantId, label) => {
                  await ApiClient.updatePost(selectedPost.id, { variantId, variantLabel: label });
                  loadPosts();
                }}
              />

              <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 shadow-sm focus-within:border-brand-500/80 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-400">
                    1. Хук (первая строчка твита — захват внимания):
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">{[...activeVariant.hook].length} знака</span>
                </div>
                <textarea
                  rows={2}
                  value={activeVariant.hook}
                  onChange={(e) => handleContentChange(e.target.value, activeVariant.body)}
                  placeholder="Напишите провокационный хук, вопрос или интригующий факт..."
                  className="w-full bg-surface-950/60 border border-surface-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-y"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center space-x-1">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Совет: хук должен заставить нажать «Показать ещё» или открыть тред.</span>
                </p>
              </div>

              <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 shadow-sm focus-within:border-brand-500/80 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    2. Тело поста (раскрытие мысли или тред):
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">{[...activeVariant.body].length} знака</span>
                </div>
                <textarea
                  ref={bodyRef}
                  rows={5}
                  value={activeVariant.body}
                  onChange={(e) => handleContentChange(activeVariant.hook, e.target.value)}
                  placeholder="Основная ценность, выводы, список пунктов или призыв к действию..."
                  className="w-full bg-surface-950/60 border border-surface-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-y leading-relaxed"
                />
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-surface-800/80 text-xs text-slate-400">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => wrapBody("**", "**")}
                      className="p-1 hover:text-slate-200 hover:bg-surface-800 rounded"
                      title="Жирный"
                    >
                      <b>B</b>
                    </button>
                    <button
                      type="button"
                      onClick={() => wrapBody("_", "_")}
                      className="p-1 hover:text-slate-200 hover:bg-surface-800 rounded italic"
                      title="Курсив"
                    >
                      <i>I</i>
                    </button>
                    <button
                      type="button"
                      onClick={applyBodyList}
                      className="p-1 hover:text-slate-200 hover:bg-surface-800 rounded"
                      title="Список"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => wrapBody("", " 😀")}
                      className="p-1 hover:text-slate-200 hover:bg-surface-800 rounded"
                      title="Смайлики"
                    >
                      😀
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500">Автосохранение</span>
                </div>
              </div>

              <MediaGallery
                key={`${selectedPost.id}:${activeVariant.id}`}
                postId={selectedPost.id}
                variantId={activeVariant.id}
                onPreviewChange={handlePreviewMedia}
              />

              <TwitterPreview
                variant={activeVariant}
                userName={userProfile.name}
                userHandle={userProfile.handle}
                avatarUrl={userProfile.avatarUrl}
                status={selectedPost.status}
                media={previewMedia}
                onMarkPosted={handleMarkPosted}
              />

              <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 shadow-sm focus-within:border-brand-500/80 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    4. Заметки и гипотеза:
                  </label>
                </div>
                <textarea
                  value={selectedPost.notes}
                  onChange={(e) => {
                    const newNotes = e.target.value;
                    ApiClient.updatePost(selectedPost.id, { notes: newNotes });
                    setPosts(
                      posts.map((p) => (p.id === selectedPost.id ? { ...p, notes: newNotes } : p))
                    );
                  }}
                  rows={3}
                  placeholder="Зачем пишем этот пост? Какая гипотеза? Ссылка на источник данных..."
                  className="w-full bg-surface-950/60 border border-surface-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors resize-y leading-relaxed"
                />
                {selectedPost.tweetUrl && (
                  <div className="mt-2 pt-2 border-t border-surface-800/80 flex items-center gap-2 text-xs text-brand-400">
                    <span>Ссылка на пост в X:</span>
                    <a
                      href={selectedPost.tweetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline flex items-center gap-1 break-all"
                    >
                      {selectedPost.tweetUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 flex items-center justify-center bg-surface-950 text-slate-500 text-sm">
            Выберите черновик слева или создайте новый
          </main>
        )}

        {/* Right Column: AI Copilot Assistant */}
        {selectedPost && activeVariant && (
          <div className="w-80 border-l border-[#162032] bg-[#0c111c]/60 flex flex-col shrink-0 min-h-0 h-full">
            <AiCopilotPanel
              currentText={activeVariant.fullText}
              onApplyText={(text) => {
                const parts = text.split("\n\n");
                handleContentChange(parts[0] || "", parts.slice(1).join("\n\n"));
              }}
              onApplyHook={(hook) => handleContentChange(hook, activeVariant.body)}
              onAddAsVariant={async (hook) => {
                await ApiClient.addVariant(selectedPost.id, {
                  hook,
                  body: activeVariant.body,
                  label: `AI Хук ${selectedPost.variants.length + 1}`
                });
                loadPosts();
              }}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <PlaybookModal
        isOpen={isPlaybookOpen}
        onClose={() => setIsPlaybookOpen(false)}
        methodologies={methodologies}
        toneProfile={toneProfile}
        onInsertTemplate={handleInsertTemplate}
        onSaveMethodology={async (data) => {
          await ApiClient.saveMethodology(data);
          loadPlaybook();
        }}
        onDeleteMethodology={async (id) => {
          await ApiClient.deleteMethodology(id);
          loadPlaybook();
        }}
        onSaveToneProfile={async (data) => {
          await ApiClient.saveToneProfile(data);
          loadPlaybook();
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userProfile={userProfile}
        onSaveProfile={(p) => {
          setUserProfile(p);
          localStorage.setItem("xm_user_profile", JSON.stringify(p));
        }}
      />
    </div>
  );
};

export default App;
