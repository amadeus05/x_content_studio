import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Search,
  Settings,
  ExternalLink,
  Info,
  Check,
  Pin,
  LogOut
} from "lucide-react";
import { ApiClient } from "./services/ApiClient.ts";
import type { AuthConfig } from "./services/ApiClient.ts";
import {
  PostDto,
  PostHookDto,
  PostBodyDto,
  PostVariantDto
} from "../modules/content/application/dtos/PostDto.ts";
import { MethodologyDto, ToneProfileDto } from "../modules/playbook/application/use-cases/GetPlaybookUseCase.ts";
import { TwitterPreview } from "./components/TwitterPreview.tsx";
import { ContentTabs } from "./components/ContentTabs.tsx";
import { PlaybookModal } from "./components/PlaybookModal.tsx";
import { AiCopilotPanel } from "./components/AiCopilotPanel.tsx";
import { PostCard } from "./components/PostCard.tsx";
import { SettingsModal } from "./components/SettingsModal.tsx";
import { TagEditor } from "./components/TagEditor.tsx";
import { TagFilter } from "./components/TagFilter.tsx";
import { StudioSelect } from "./components/StudioSelect.tsx";
import { MediaGallery, PreviewMedia } from "./components/MediaGallery.tsx";
import { useFeedback } from "./components/Feedback.tsx";
import { LoginPage } from "./components/LoginPage.tsx";

/** Copy glyph с ровным центром в viewBox (у Lucide Copy оптика уезжает влево-вверх). */
const CopyGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 16 16"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="5.25" y="5.25" width="7.5" height="7.5" rx="1.25" />
    <path d="M3.5 10.5V4.25A1.25 1.25 0 0 1 4.75 3h6.25" />
  </svg>
);

export const App: React.FC = () => {
  const feedback = useFeedback();
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [authBootError, setAuthBootError] = useState("");
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
  const hookSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [copiedField, setCopiedField] = useState<"hook" | "body" | null>(null);
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia[]>([]);
  const handlePreviewMedia = useCallback((items: PreviewMedia[]) => {
    setPreviewMedia(items);
  }, []);

  const copyField = useCallback(async (field: "hook" | "body", text: string) => {
    const value = text.trim();
    if (!value) {
      feedback.toast("info", "Нечего копировать — поле пустое");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((cur) => (cur === field ? null : cur)), 1500);
    } catch (err: any) {
      feedback.error("Не удалось скопировать", err);
    }
  }, [feedback]);

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
    let cancelled = false;
    (async () => {
      try {
        const [cfg, me] = await Promise.all([ApiClient.getAuthConfig(), ApiClient.getMe()]);
        if (cancelled) return;
        setAuthConfig(cfg);
        setAuthBootError("");
        const needsGate = cfg.telegramEnabled || cfg.pinEnabled;
        setAuthenticated(!needsGate || me.authenticated);
      } catch (err: any) {
        if (!cancelled) {
          setAuthConfig(null);
          setAuthenticated(false);
          setAuthBootError(err?.message || "Не удалось проверить сессию");
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadPosts();
    loadPlaybook();
    loadTags();
  }, [activeFilterStatus, selectedTags, authenticated]);

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
      if (hookSaveTimerRef.current) clearTimeout(hookSaveTimerRef.current);
      if (bodySaveTimerRef.current) clearTimeout(bodySaveTimerRef.current);
    };
  }, []);

  const selectedPost = posts.find((p) => p.id === selectedPostId) || posts[0];

  // Пулы хуков и тел выбранного поста с безопасным fallback
  const hooks: PostHookDto[] =
    selectedPost?.hooks && selectedPost.hooks.length > 0
      ? selectedPost.hooks
      : [
          {
            id: selectedPost?.activeVariantId || "default-hook",
            postId: selectedPost?.id || "",
            label: selectedPost?.activeVariant?.variantLabel || "Хук 1",
            text: selectedPost?.activeVariant?.hook || "",
            pinnedBodyId: null,
            orderIndex: 0,
            charCount: [...(selectedPost?.activeVariant?.hook || "")].length,
            createdAt: selectedPost?.createdAt || new Date().toISOString(),
            updatedAt: selectedPost?.updatedAt || new Date().toISOString()
          }
        ];

  const bodies: PostBodyDto[] =
    selectedPost?.bodies && selectedPost.bodies.length > 0
      ? selectedPost.bodies
      : [
          {
            id: "default-body",
            postId: selectedPost?.id || "",
            label: "Тело 1",
            text: selectedPost?.activeVariant?.body || "",
            orderIndex: 0,
            charCount: [...(selectedPost?.activeVariant?.body || "")].length,
            createdAt: selectedPost?.createdAt || new Date().toISOString(),
            updatedAt: selectedPost?.updatedAt || new Date().toISOString()
          }
        ];

  const activeHook: PostHookDto =
    hooks.find((h) => h.id === selectedPost?.activeHookId) ||
    hooks.find((h) => h.id === selectedPost?.activeVariantId) ||
    hooks[0];

  const activeBody: PostBodyDto =
    bodies.find((b) => b.id === selectedPost?.activeBodyId) ||
    bodies[0];

  const hookText = activeHook?.text || "";
  const bodyText = activeBody?.text || "";
  const fullCombinedText =
    hookText && bodyText ? `${hookText}\n\n${bodyText}` : hookText || bodyText;
  const totalChars = [...fullCombinedText].length;
  const remainingChars = 280 - totalChars;
  const isOverLimit = totalChars > 280;

  const previewVariant: PostVariantDto = {
    id: activeHook ? activeHook.id : "preview-id",
    postId: selectedPost ? selectedPost.id : "",
    hook: hookText,
    body: bodyText,
    fullText: fullCombinedText,
    variantLabel: activeHook ? activeHook.label : "Вариант",
    pinnedBodyId: activeHook?.pinnedBodyId ?? null,
    orderIndex: activeHook ? activeHook.orderIndex : 0,
    charCount: totalChars,
    remainingChars,
    isOverLimit,
    isPremium: totalChars > 280,
    createdAt: activeHook ? activeHook.createdAt : new Date().toISOString(),
    updatedAt: activeHook ? activeHook.updatedAt : new Date().toISOString()
  };

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

  // Выбор активного хука (с авто-переключением закрепленного тела)
  const handleSelectHook = async (hookId: string) => {
    if (!selectedPost) return;
    const targetHook = hooks.find((h) => h.id === hookId);
    let targetBodyId = selectedPost.activeBodyId;
    if (targetHook?.pinnedBodyId && bodies.some((b) => b.id === targetHook.pinnedBodyId)) {
      targetBodyId = targetHook.pinnedBodyId;
    }

    const updatedPost: PostDto = {
      ...selectedPost,
      activeHookId: hookId,
      activeVariantId: hookId,
      activeBodyId: targetBodyId
    };
    setPosts(posts.map((p) => (p.id === selectedPost.id ? updatedPost : p)));

    try {
      const updated = await ApiClient.selectHook(selectedPost.id, hookId);
      setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      console.error("Select hook error:", err);
    }
  };

  // Добавление хука
  const handleAddHook = async (label?: string, text?: string) => {
    if (!selectedPost) return;
    try {
      const updated = await ApiClient.addHook(selectedPost.id, {
        label: label || `Хук ${hooks.length + 1}`,
        text: text || ""
      });
      setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      feedback.error("Не удалось добавить хук", err);
    }
  };

  // Удаление хука
  const handleDeleteHook = async (hookId: string) => {
    if (!selectedPost || hooks.length <= 1) return;
    const targetHook = hooks.find((h) => h.id === hookId);
    const ok = await feedback.confirm({
      title: "Удалить хук?",
      message: targetHook?.label
        ? `Хук «${targetHook.label}» будет удалён без восстановления.`
        : "Хук будет удалён без восстановления.",
      confirmLabel: "Удалить"
    });
    if (!ok) return;

    const previous = posts;
    const nextHooks = hooks.filter((h) => h.id !== hookId);
    const nextActiveHook = nextHooks.find((h) => h.id === selectedPost.activeHookId) || nextHooks[0];
    setPosts(
      posts.map((p) =>
        p.id === selectedPost.id
          ? {
              ...p,
              hooks: nextHooks,
              activeHookId: nextActiveHook.id,
              activeVariantId: nextActiveHook.id,
              activeHook: nextActiveHook
            }
          : p
      )
    );

    try {
      const updated = await ApiClient.deleteHook(selectedPost.id, hookId);
      setPosts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      setPosts(previous);
      feedback.error("Не удалось удалить хук", err);
    }
  };

  // Переименование хука
  const handleUpdateHookLabel = async (hookId: string, label: string) => {
    if (!selectedPost) return;
    try {
      const updated = await ApiClient.updateHook(selectedPost.id, hookId, { label });
      setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      console.error("Update hook label error:", err);
    }
  };

  // Изменение текста хука
  const handleHookChange = (newHookText: string) => {
    if (!selectedPost || !activeHook) return;

    const updatedHooks = hooks.map((h) =>
      h.id === activeHook.id
        ? { ...h, text: newHookText, charCount: [...newHookText].length }
        : h
    );

    const updatedPost: PostDto = {
      ...selectedPost,
      hooks: updatedHooks,
      activeHook: { ...activeHook, text: newHookText, charCount: [...newHookText].length }
    };
    setPosts(posts.map((p) => (p.id === selectedPost.id ? updatedPost : p)));

    const postId = selectedPost.id;
    const hookId = activeHook.id;
    if (hookSaveTimerRef.current) clearTimeout(hookSaveTimerRef.current);
    hookSaveTimerRef.current = setTimeout(() => {
      ApiClient.updateHook(postId, hookId, { text: newHookText }).catch((err) => {
        console.error("Save hook error:", err);
      });
    }, 400);
  };

  // Закрепление тела за хуком
  const handlePinBody = async (bodyId: string | null) => {
    if (!selectedPost || !activeHook) return;

    const nextHooks = hooks.map((h) =>
      h.id === activeHook.id ? { ...h, pinnedBodyId: bodyId } : h
    );
    const updatedPost: PostDto = {
      ...selectedPost,
      hooks: nextHooks,
      activeHook: { ...activeHook, pinnedBodyId: bodyId }
    };
    setPosts(posts.map((p) => (p.id === selectedPost.id ? updatedPost : p)));

    try {
      const updated = await ApiClient.pinBodyToHook(selectedPost.id, activeHook.id, bodyId);
      setPosts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
      feedback.toast(
        "success",
        bodyId ? "Тело поста закреплено за данным хуком 📌" : "Закрепление тела снято"
      );
    } catch (err: any) {
      feedback.error("Не удалось изменить закрепление тела", err);
    }
  };

  // Выбор тела поста
  const handleSelectBody = async (bodyId: string) => {
    if (!selectedPost) return;

    const updatedPost: PostDto = {
      ...selectedPost,
      activeBodyId: bodyId
    };
    setPosts(posts.map((p) => (p.id === selectedPost.id ? updatedPost : p)));

    try {
      const updated = await ApiClient.selectBody(selectedPost.id, bodyId);
      setPosts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      console.error("Select body error:", err);
    }
  };

  // Добавление тела поста
  const handleAddBody = async (label?: string, text?: string) => {
    if (!selectedPost) return;
    try {
      const updated = await ApiClient.addBody(selectedPost.id, {
        label: label || `Тело ${bodies.length + 1}`,
        text: text || ""
      });
      setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      feedback.error("Не удалось добавить тело поста", err);
    }
  };

  // Удаление тела поста
  const handleDeleteBody = async (bodyId: string) => {
    if (!selectedPost || bodies.length <= 1) return;
    const targetBody = bodies.find((b) => b.id === bodyId);
    const ok = await feedback.confirm({
      title: "Удалить тело поста?",
      message: targetBody?.label
        ? `Тело «${targetBody.label}» будет удалено без восстановления.`
        : "Тело поста будет удалено без восстановления.",
      confirmLabel: "Удалить"
    });
    if (!ok) return;

    const previous = posts;
    const nextBodies = bodies.filter((b) => b.id !== bodyId);
    const nextActiveBody = nextBodies.find((b) => b.id === selectedPost.activeBodyId) || nextBodies[0];
    setPosts(
      posts.map((p) =>
        p.id === selectedPost.id
          ? {
              ...p,
              bodies: nextBodies,
              activeBodyId: nextActiveBody.id,
              activeBody: nextActiveBody
            }
          : p
      )
    );

    try {
      const updated = await ApiClient.deleteBody(selectedPost.id, bodyId);
      setPosts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      setPosts(previous);
      feedback.error("Не удалось удалить тело", err);
    }
  };

  // Переименование тела поста
  const handleUpdateBodyLabel = async (bodyId: string, label: string) => {
    if (!selectedPost) return;
    try {
      const updated = await ApiClient.updateBody(selectedPost.id, bodyId, { label });
      setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err: any) {
      console.error("Update body label error:", err);
    }
  };

  // Изменение текста тела поста
  const handleBodyChange = (newBodyText: string) => {
    if (!selectedPost || !activeBody) return;

    const updatedBodies = bodies.map((b) =>
      b.id === activeBody.id
        ? { ...b, text: newBodyText, charCount: [...newBodyText].length }
        : b
    );

    const updatedPost: PostDto = {
      ...selectedPost,
      bodies: updatedBodies,
      activeBody: { ...activeBody, text: newBodyText, charCount: [...newBodyText].length }
    };
    setPosts(posts.map((p) => (p.id === selectedPost.id ? updatedPost : p)));

    const postId = selectedPost.id;
    const bodyId = activeBody.id;
    if (bodySaveTimerRef.current) clearTimeout(bodySaveTimerRef.current);
    bodySaveTimerRef.current = setTimeout(() => {
      ApiClient.updateBody(postId, bodyId, { text: newBodyText }).catch((err) => {
        console.error("Save body error:", err);
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
    if (!selectedPost) return;
    const lines = template.split("\n\n");
    const hook = lines[0] || "";
    const body = lines.slice(1).join("\n\n");
    if (hook) handleHookChange(hook);
    if (body) handleBodyChange(body);
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
    if (!selectedPost || !activeBody) return;
    const el = bodyRef.current;
    const value = activeBody.text;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || (after ? "текст" : "");
    handleBodyChange(value.slice(0, start) + before + selected + after + value.slice(end));
  };

  const applyBodyList = () => {
    if (!selectedPost || !activeBody) return;
    const el = bodyRef.current;
    const value = activeBody.text;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? value.length;
    const block = (start === end ? value : value.slice(start, end)) || value;
    const listed = block
      .split("\n")
      .map((line) => (line.startsWith("- ") || !line.trim() ? line : `- ${line}`))
      .join("\n");
    const next = start === end ? listed : value.slice(0, start) + listed + value.slice(end);
    handleBodyChange(next);
  };

  const statusFilters = [
    { id: "ALL", label: "Все статусы", triggerLabel: "Все статусы", color: "text-slate-200", dotClass: "bg-slate-400" },
    { id: "IDEA", label: "💡 Идея", triggerLabel: "Идеи", color: "text-sky-400", dotClass: "bg-sky-400" },
    { id: "DRAFT", label: "🔥 Черновик", triggerLabel: "Черновики", color: "text-amber-400", dotClass: "bg-amber-400" },
    { id: "AI_REVIEW", label: "👀 На ревью", triggerLabel: "На ревью", color: "text-ai-400", dotClass: "bg-ai-400" },
    { id: "READY", label: "🚀 Готов", triggerLabel: "Готовы", color: "text-brand-400", dotClass: "bg-brand-400" },
    { id: "POSTED", label: "📅 Запощен", triggerLabel: "Запощены", color: "text-emerald-400", dotClass: "bg-emerald-400" },
    { id: "ARCHIVED", label: "📦 Архив", triggerLabel: "Архив", color: "text-slate-500", dotClass: "bg-slate-500" }
  ];

  const postStatusOptions = [
    { id: "IDEA", label: "💡 Идея", color: "text-sky-400" },
    { id: "DRAFT", label: "🔥 Черновик", color: "text-amber-400" },
    { id: "AI_REVIEW", label: "👀 На ревью", color: "text-ai-400" },
    { id: "READY", label: "🚀 Готов к публикации", color: "text-brand-400" },
    { id: "POSTED", label: "📅 Запощен", color: "text-emerald-400" },
    { id: "ARCHIVED", label: "📦 Архив", color: "text-slate-500" }
  ];

  const profileInitials = (() => {
    const parts = userProfile.name.replace(/\|/g, " ").split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase();
    return (userProfile.handle || "X").slice(0, 2).toUpperCase();
  })();

  if (!authReady) {
    return (
      <div className="min-h-screen w-screen bg-surface-950 flex items-center justify-center text-slate-500 text-sm">
        Загрузка…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <LoginPage
        botUsername={authConfig?.botUsername || ""}
        pinEnabled={authConfig ? authConfig.pinEnabled : true}
        bootError={authBootError}
        onSuccess={() => {
          setAuthBootError("");
          setAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-950">
      {/* Top Navbar */}
      <header className="h-14 border-b border-surface-800 bg-surface-900/90 backdrop-blur-md pl-3 pr-4 flex items-center justify-between z-30 shrink-0 select-none">
        <div className="flex items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white shrink-0">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div className="flex items-center gap-2 h-8">
              <span className="font-bold text-white tracking-tight text-sm leading-none">X Content Studio</span>
              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-bold uppercase tracking-wider leading-none bg-brand-500/10 text-brand-400 border border-brand-500/30">
                PRO
              </span>
            </div>
          </div>

          <div className="relative w-72 hidden md:block ml-[6.75rem]">
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
            <svg
              className="w-3.5 h-3.5 text-brand-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
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
          <div className="px-3 py-2.5 border-b border-surface-800/80 bg-surface-900/40">
            <div className="flex items-center gap-1.5">
              <StudioSelect
                aria-label="Фильтр по статусу"
                compact
                fullWidth
                className="flex-1 min-w-0"
                value={activeFilterStatus}
                options={statusFilters}
                count={posts.length}
                onChange={setActiveFilterStatus}
              />
              <TagFilter compact tags={tags} selected={selectedTags} onChange={setSelectedTags} />
            </div>
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

          <div className="px-3 py-2.5 border-t border-surface-800 bg-surface-950/60 flex items-center justify-between text-[11px] text-slate-500">
            <button
              type="button"
              onClick={async () => {
                await ApiClient.logout();
                setAuthenticated(false);
              }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-rose-300 transition-colors"
              title="Выйти из аккаунта"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
            <span className="font-mono text-[10px]">v1.0</span>
          </div>
        </aside>

        {selectedPost && activeHook && activeBody ? (
          <main className="flex-1 flex flex-col min-w-0 bg-surface-950 overflow-y-auto">
            <div className="px-6 py-3 border-b border-surface-800 bg-surface-900/40 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center space-x-3">
                <StudioSelect
                  aria-label="Статус поста"
                  value={selectedPost.status}
                  options={postStatusOptions}
                  onChange={handleStatusChange}
                />
                <TagEditor tags={selectedPost.tags} onChangeTags={handleTagsChange} />
              </div>
              <div className="flex items-center space-x-2 bg-surface-900 px-3 py-1 rounded-lg border border-surface-800 shrink-0">
                <span className="text-xs text-slate-400">Лимит символов:</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-200 tabular-nums inline-block min-w-[4ch] text-right">
                    {totalChars}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">/ 280</span>
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
                        isOverLimit
                          ? "text-rose-500"
                          : remainingChars <= 20
                            ? "text-amber-400"
                            : "text-brand-500"
                      }
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${Math.min(100, (totalChars / 280) * 100)}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="p-6 max-w-4xl w-full mx-auto space-y-6">

              {/* 1. Блок Хуков поста */}
              <ContentTabs
                items={hooks.map((h) => ({
                  id: h.id,
                  label: h.label,
                  charCount: h.charCount,
                  isPinned: Boolean(h.pinnedBodyId)
                }))}
                activeId={activeHook.id}
                onSelect={handleSelectHook}
                onAdd={() => handleAddHook()}
                onDelete={handleDeleteHook}
                onUpdateLabel={handleUpdateHookLabel}
                title="Хуки поста"
                iconType="hook"
                addButtonText="Новый хук"
                theme="purple"
              />

              <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 shadow-sm focus-within:border-purple-500/80 transition-all">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    1. Хук (первая строчка твита):
                  </label>
                  <button
                    type="button"
                    title="Копировать хук"
                    onClick={() => copyField("hook", activeHook.text)}
                    className="grid size-[22px] place-items-center rounded border border-surface-700/80 bg-surface-950/50 p-0 leading-none text-slate-400 hover:text-purple-300 hover:border-purple-500/40 hover:bg-purple-500/10 transition-colors shrink-0"
                  >
                    {copiedField === "hook" ? (
                      <Check className="size-3 text-emerald-400" strokeWidth={2.5} />
                    ) : (
                      <CopyGlyph className="size-3.5" />
                    )}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={activeHook.text}
                  onChange={(e) => handleHookChange(e.target.value)}
                  placeholder="Напишите провокационный хук, вопрос или интригующий факт..."
                  className="w-full bg-surface-950/60 border border-surface-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-y"
                />
                <div className="mt-1.5 flex items-start justify-between gap-3">
                  <p className="text-[11px] text-slate-500 min-w-0">
                    <Info
                      className="mr-1.5 inline-block size-[13px] align-[-2px] text-amber-400"
                      strokeWidth={2}
                      aria-hidden
                    />
                    Совет: хук должен заставить нажать «Показать ещё» или открыть тред.
                  </p>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0 pt-px">
                    {[...activeHook.text].length} знака
                  </span>
                </div>
              </div>

              {/* 2. Блок Тел поста */}
              <ContentTabs
                items={bodies.map((b) => ({
                  id: b.id,
                  label: b.label,
                  charCount: b.charCount,
                  isPinned: activeHook?.pinnedBodyId === b.id
                }))}
                activeId={activeBody.id}
                onSelect={handleSelectBody}
                onAdd={() => handleAddBody()}
                onDelete={handleDeleteBody}
                onUpdateLabel={handleUpdateBodyLabel}
                title="Тела поста"
                iconType="body"
                addButtonText="Новое тело"
                theme="emerald"
              />

              <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 shadow-sm focus-within:border-emerald-500/80 transition-all">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center space-x-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      2. Тело поста (раскрытие мысли или тред):
                    </label>
                    {activeHook && activeBody && (
                      <button
                        type="button"
                        onClick={() =>
                          handlePinBody(
                            activeHook.pinnedBodyId === activeBody.id ? null : activeBody.id
                          )
                        }
                        title={
                          activeHook.pinnedBodyId === activeBody.id
                            ? `Тело закреплено за «${activeHook.label}». Нажмите, чтобы отвязать.`
                            : `Закрепить это тело за «${activeHook.label}» по умолчанию.`
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium border transition-all max-w-[18rem] ${
                          activeHook.pinnedBodyId === activeBody.id
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
                            : "bg-surface-950/60 border-surface-750 text-slate-400 hover:text-slate-200 hover:border-surface-600"
                        }`}
                      >
                        <Pin
                          className={`size-3 rotate-45 shrink-0 ${
                            activeHook.pinnedBodyId === activeBody.id
                              ? "fill-amber-300 text-amber-300"
                              : ""
                          }`}
                        />
                        <span className="truncate">
                          {activeHook.pinnedBodyId === activeBody.id
                            ? `Закреплено за «${activeHook.label}»`
                            : `Закрепить за «${activeHook.label}»`}
                        </span>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Копировать тело"
                    onClick={() => copyField("body", activeBody.text)}
                    className="grid size-[22px] place-items-center rounded border border-surface-700/80 bg-surface-950/50 p-0 leading-none text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors shrink-0"
                  >
                    {copiedField === "body" ? (
                      <Check className="size-3 text-emerald-400" strokeWidth={2.5} />
                    ) : (
                      <CopyGlyph className="size-3.5" />
                    )}
                  </button>
                </div>
                <textarea
                  ref={bodyRef}
                  rows={5}
                  value={activeBody.text}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  placeholder="Основная ценность, выводы, список пунктов или призыв к действию..."
                  className="w-full bg-surface-950/60 border border-surface-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-y leading-relaxed"
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
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {[...activeBody.text].length} знака
                  </span>
                </div>
              </div>

              <MediaGallery
                key={`${selectedPost.id}:${activeHook.id}`}
                postId={selectedPost.id}
                variantId={activeHook.id}
                onPreviewChange={handlePreviewMedia}
              />

              <TwitterPreview
                variant={previewVariant}
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
        {selectedPost && activeHook && activeBody && (
          <div className="w-80 border-l border-[#162032] bg-[#0c111c]/60 flex flex-col shrink-0 min-h-0 h-full">
            <AiCopilotPanel
              currentText={previewVariant.fullText}
              onApplyText={(text) => {
                const parts = text.split("\n\n");
                handleHookChange(parts[0] || "");
                handleBodyChange(parts.slice(1).join("\n\n"));
              }}
              onApplyHook={(hook) => handleHookChange(hook)}
              onAddHook={async (hook) => {
                await handleAddHook(`AI Хук ${hooks.length + 1}`, hook);
              }}
              onApplyBody={(body) => handleBodyChange(body)}
              onAddBody={async (body) => {
                await handleAddBody(`AI Тело ${bodies.length + 1}`, body);
              }}
              onAddAsVariant={async (hook) => {
                await handleAddHook(`AI Хук ${hooks.length + 1}`, hook);
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
        onLogout={() => setAuthenticated(false)}
      />
    </div>
  );
};

export default App;
