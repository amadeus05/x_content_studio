import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Search,
  BookOpen,
  Settings,
  Sparkles,
  Filter,
  Layers,
  ChevronDown,
  Hash,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Trash2
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
import { MediaGallery, PreviewMedia } from "./components/MediaGallery.tsx";

export const App: React.FC = () => {
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [activeFilterStatus, setActiveFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
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
        search: searchQuery,
        tag: selectedTag
      });
      setPosts(data);
      if (data.length > 0 && !selectedPostId) {
        setSelectedPostId(data[0].id);
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
  }, [activeFilterStatus, selectedTag]);

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
      setPosts([newPost, ...posts]);
      setSelectedPostId(newPost.id);
    } catch (err: any) {
      alert(`Ошибка создания: ${err.message}`);
    }
  };

  // Удаление поста
  const handleDeletePost = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Удалить этот черновик?")) return;
    try {
      await ApiClient.deletePost(id);
      const updated = posts.filter((p) => p.id !== id);
      setPosts(updated);
      if (selectedPostId === id) {
        setSelectedPostId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err: any) {
      alert(`Ошибка удаления: ${err.message}`);
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
      alert(`Невозможно сменить статус: ${err.message}`);
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
      alert(`Ошибка добавления варианта: ${err.message}`);
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
      alert(`Ошибка: ${err.message}`);
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
      const updated = await ApiClient.updatePost(selectedPost.id, {
        tweetUrl: tweetUrl || "",
        metrics: {}
      });
      const posted = await ApiClient.changeStatus(selectedPost.id, "POSTED");
      setPosts(posts.map((p) => (p.id === posted.id ? posted : p)));
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
    }
  };

  const statusFilters = [
    { id: "ALL", label: "Все посты" },
    { id: "IDEA", label: "💡 Идеи" },
    { id: "DRAFT", label: "✍️ Черновики" },
    { id: "AI_REVIEW", label: "🤖 AI доработка" },
    { id: "READY", label: "⏳ Готовы" },
    { id: "POSTED", label: "🚀 Опубликовано" },
    { id: "ARCHIVED", label: "📦 Архив" }
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090c12]">
      {/* Top Navbar */}
      <header className="h-14 border-b border-[#1c2436] bg-[#0d121c] px-5 flex items-center justify-between shrink-0 select-none z-10">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
                𝕏 Content Studio
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 font-mono">
                  PRO
                </span>
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                loadPosts();
              }}
              placeholder="Полнотекстовый поиск... (Ctrl+K)"
              className="w-full bg-[#131924] border border-[#202a3d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPlaybookOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151c2a] hover:bg-[#1f293d] text-zinc-300 hover:text-white text-xs font-semibold rounded-lg border border-[#243046] transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Методики & ToV</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-zinc-400 hover:text-white bg-[#151c2a] hover:bg-[#1f293d] rounded-lg border border-[#243046] transition"
            title="Настройки X и API"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={handleCreatePost}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-bold rounded-lg shadow-md shadow-sky-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Новый черновик</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (3 columns) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Post List & Filters */}
        <div className="w-80 border-r border-[#1c2436] bg-[#0c1017] flex flex-col shrink-0">
          {/* Status filter bar */}
          <div className="p-3 border-b border-[#1c2436] overflow-x-auto flex items-center gap-1.5">
            {statusFilters.map((st) => (
              <button
                key={st.id}
                onClick={() => setActiveFilterStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  activeFilterStatus === st.id
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#151b26]"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Tags list */}
          {tags.length > 0 && (
            <div className="px-3 py-2 border-b border-[#1c2436] flex items-center gap-1 overflow-x-auto text-[11px]">
              <button
                onClick={() => setSelectedTag("")}
                className={`px-2 py-0.5 rounded ${
                  selectedTag === "" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Все теги
              </button>
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(t === selectedTag ? "" : t)}
                  className={`px-2 py-0.5 rounded font-medium ${
                    selectedTag === t
                      ? "bg-sky-500/25 text-sky-300 border border-sky-500/40"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          {/* List of cards */}
          <div className="p-3 overflow-y-auto flex-1 space-y-2.5">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                {loading ? "Загрузка черновиков..." : "Нет постов в этом статусе. Нажмите «Новый черновик»!"}
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
        </div>

        {/* Center Column: Editor & Live X Preview */}
        {selectedPost && activeVariant ? (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-[#090c12]">
            <div className="max-w-3xl w-full mx-auto space-y-6">
              {/* Top Meta Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1c2436] flex-wrap gap-3">
                {/* Status Switcher */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400">Статус:</span>
                  <select
                    value={selectedPost.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="bg-[#121824] border border-[#232f44] text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="IDEA">💡 Идея</option>
                    <option value="DRAFT">✍️ Черновик</option>
                    <option value="AI_REVIEW">🤖 На доработке AI</option>
                    <option value="READY">⏳ Готов к публикации</option>
                    <option value="POSTED">🚀 Опубликован</option>
                    <option value="ARCHIVED">📦 В архиве</option>
                  </select>
                </div>

                {/* Interactive Tag Editor */}
                <div className="flex items-center gap-2">
                  <TagEditor tags={selectedPost.tags} onChangeTags={handleTagsChange} />
                </div>
              </div>

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

              {/* Editor Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-sky-400 mb-1 flex items-center justify-between">
                    <span>1. Хук (Первая строчка твита — захват внимания):</span>
                    <span className="text-[10px] text-zinc-500 lowercase font-normal font-mono">
                      {[...activeVariant.hook].length} знаков
                    </span>
                  </label>
                  <input
                    type="text"
                    value={activeVariant.hook}
                    onChange={(e) => handleContentChange(e.target.value, activeVariant.body)}
                    placeholder="Напишите провокационный хук, вопрос или интригующий факт..."
                    className="w-full bg-[#101520] border border-[#212c40] rounded-xl px-4 py-3 text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center justify-between">
                    <span>2. Тело поста (Раскрытие мысли или тред):</span>
                    <span className="text-[10px] text-zinc-500 lowercase font-normal font-mono">
                      {[...activeVariant.body].length} знаков
                    </span>
                  </label>
                  <textarea
                    value={activeVariant.body}
                    onChange={(e) => handleContentChange(activeVariant.hook, e.target.value)}
                    placeholder="Основная ценность, выводы, список пунктов или призыв к действию..."
                    rows={6}
                    className="w-full bg-[#101520] border border-[#212c40] rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed shadow-inner"
                  />
                </div>
              </div>

              <MediaGallery
                key={`${selectedPost.id}:${activeVariant.id}`}
                postId={selectedPost.id}
                variantId={activeVariant.id}
                onPreviewChange={handlePreviewMedia}
              />

              {/* Live Twitter Preview Component */}
              <div>
                <TwitterPreview
                  variant={activeVariant}
                  userName={userProfile.name}
                  userHandle={userProfile.handle}
                  avatarUrl={userProfile.avatarUrl}
                  status={selectedPost.status}
                  media={previewMedia}
                  onMarkPosted={handleMarkPosted}
                />
              </div>

              {/* Internal Notes & Hypothesis */}
              <div className="bg-[#0f141c] border border-[#1e2738] rounded-xl p-4 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  💡 Внутренние заметки и гипотеза поста:
                </label>
                <textarea
                  value={selectedPost.notes}
                  onChange={(e) => {
                    const newNotes = e.target.value;
                    ApiClient.updatePost(selectedPost.id, { notes: newNotes });
                    setPosts(
                      posts.map((p) => (p.id === selectedPost.id ? { ...p, notes: newNotes } : p))
                    );
                  }}
                  rows={2}
                  placeholder="Зачем пишем этот пост? Какая гипотеза? Ссылка на источник данных..."
                  className="w-full bg-[#0b0e14] border border-[#1e2738] rounded-lg p-2.5 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                />

                {selectedPost.tweetUrl && (
                  <div className="flex items-center gap-2 pt-2 text-xs text-sky-400">
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
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
            Выберите черновик слева или создайте новый
          </div>
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
