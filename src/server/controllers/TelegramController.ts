import type { Context } from "hono";
import type { Bindings } from "../index.ts";
import { TelegramApiClient } from "../../modules/telegram/infrastructure/TelegramApiClient.ts";
import { TelegramKvStore } from "../../modules/telegram/infrastructure/TelegramKvStore.ts";
import { BotCommandRouter } from "../../modules/telegram/application/BotCommandRouter.ts";
import { ChatWithAiUseCase } from "../../modules/telegram/application/use-cases/ChatWithAiUseCase.ts";
import { CreatePostViaBotUseCase } from "../../modules/telegram/application/use-cases/CreatePostViaBotUseCase.ts";
import { FindPostViaBotUseCase } from "../../modules/telegram/application/use-cases/FindPostViaBotUseCase.ts";
import { ConversationOrchestrator } from "../../modules/telegram/application/ConversationOrchestrator.ts";
import { AiOrchestrator } from "../../modules/ai-copilot/infrastructure/AiOrchestrator.ts";
import { D1PostRepository } from "../../modules/content/infrastructure/D1PostRepository.ts";
import { CloudflareD1Adapter, MemoryDatabaseAdapter } from "../../shared/infrastructure/db/D1Database.ts";
import { parseAllowedIds } from "../auth/telegram.ts";
import type { TgUpdate } from "../../modules/telegram/application/BotCommandRouter.ts";

function getEnv(): Record<string, string | undefined> {
  return ((globalThis as any).process?.env || {}) as Record<string, string | undefined>;
}

/**
 * Обработчик webhook-апдейтов от Telegram.
 * Подключается к /api/telegram/webhook в server/index.ts
 */
export async function handleTelegramWebhook(c: Context<{ Bindings: Bindings }>): Promise<Response> {
  const env = c.env;
  const processEnv = getEnv();

  const botToken =
    env?.TELEGRAM_BOT_TOKEN || processEnv.TELEGRAM_BOT_TOKEN || "";

  if (!botToken) {
    console.error("[TelegramController] TELEGRAM_BOT_TOKEN не задан");
    // Возвращаем 200 чтобы Telegram не ретраил
    return c.json({ ok: false, error: "Bot not configured" });
  }

  // Разбираем апдейт
  let update: TgUpdate;
  try {
    update = await c.req.json<TgUpdate>();
  } catch {
    return c.json({ ok: false, error: "Invalid JSON" });
  }

  // Собираем зависимости
  const tgApi = new TelegramApiClient(botToken);

  const kv = env?.MEDIA_KV;
  if (!kv) {
    console.warn("[TelegramController] MEDIA_KV не доступен — сессии не сохранятся");
  }
  const kvStore = new TelegramKvStore(kv as any);

  // База данных
  const db = env?.DB
    ? new CloudflareD1Adapter(env.DB)
    : MemoryDatabaseAdapter.getInstance();
  const postRepo = new D1PostRepository(db);

  // AI-оркестратор
  const geminiKey =
    env?.GEMINI_API_KEY || env?.LLM_API_KEY ||
    processEnv.GEMINI_API_KEY || processEnv.LLM_API_KEY;
  const groqKey = env?.GROQ_API_KEY || processEnv.GROQ_API_KEY;

  const aiOrchestrator = new AiOrchestrator({
    cloudflareAi: env?.AI,
    geminiApiKey: geminiKey,
    groqApiKey: groqKey
  });

  // Use cases
  const chatWithAi = new ChatWithAiUseCase(kvStore, aiOrchestrator);
  const createPost = new CreatePostViaBotUseCase(postRepo, aiOrchestrator);
  const findPost = new FindPostViaBotUseCase(postRepo);

  // Allowed IDs
  const allowedRaw = env?.TELEGRAM_ALLOWED_IDS || processEnv.TELEGRAM_ALLOWED_IDS;
  const allowedUserIds = parseAllowedIds(allowedRaw);

  // Orchestrator (conversational layer)
  const orchestrator = new ConversationOrchestrator({
    kvStore,
    tgApi,
    aiService: aiOrchestrator,
    postRepo
  });

  // Router
  const router = new BotCommandRouter({
    kvStore,
    tgApi,
    chatWithAi,
    createPost,
    findPost,
    orchestrator,
    allowedUserIds
  });

  // Обрабатываем апдейт (асинхронно — Telegram ждёт 200 быстро)
  // Используем waitUntil если доступен (Cloudflare Workers)
  const handlePromise = router.handle(update).catch((err) => {
    console.error("[TelegramController] router.handle error:", err);
  });

  const cf = (c as any).executionCtx;
  if (cf?.waitUntil) {
    cf.waitUntil(handlePromise);
  } else {
    await handlePromise;
  }

  return c.json({ ok: true });
}
