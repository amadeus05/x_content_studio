import { Hono } from "hono";
import { cors } from "hono/cors";
import { CloudflareD1Adapter, MemoryDatabaseAdapter, IDatabase } from "../shared/infrastructure/db/D1Database.ts";
import { D1PostRepository } from "../modules/content/infrastructure/D1PostRepository.ts";
import { D1PlaybookRepository } from "../modules/playbook/infrastructure/D1PlaybookRepository.ts";
import { D1MediaRepository } from "../modules/media/infrastructure/D1MediaRepository.ts";
import { MemoryObjectStorage } from "../modules/media/infrastructure/MemoryObjectStorage.ts";
import { KvObjectStorage } from "../modules/media/infrastructure/KvObjectStorage.ts";
import { HybridAiService } from "../modules/ai-copilot/infrastructure/AiServiceAdapter.ts";
import { PostController } from "./controllers/PostController.ts";
import { PlaybookController } from "./controllers/PlaybookController.ts";
import { AiController } from "./controllers/AiController.ts";
import { MediaController } from "./controllers/MediaController.ts";
import {
  clearSessionCookieHeader,
  createSessionToken,
  parseAllowedIds,
  readSessionCookie,
  sessionCookieHeader,
  TelegramAuthPayload,
  verifySessionToken,
  verifyTelegramLogin
} from "./auth/telegram.ts";

export type Bindings = {
  DB?: any;
  AI?: any;
  MEDIA_KV?: any;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  AUTH_PIN?: string;
  GEMINI_API_KEY?: string;
  LLM_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_ALLOWED_IDS?: string;
  SESSION_SECRET?: string;
};

function processEnv(): Record<string, string | undefined> {
  return ((globalThis as any).process?.env || {}) as Record<string, string | undefined>;
}

const CORS_ORIGINS = [
  "https://x-manager.igris-volium.workers.dev",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

function authConfig(c: { env?: Bindings }) {
  const env = processEnv();
  const botToken = c.env?.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || "";
  const authPinRaw = c.env?.AUTH_PIN ?? env.AUTH_PIN;
  // Не задан — дефолт 1234. Явно "none" — PIN выключен.
  const authPin =
    authPinRaw === undefined || authPinRaw === null ? "1234" : String(authPinRaw);
  const pinEnabled = Boolean(authPin && authPin !== "none");
  // Подпись сессии: SESSION_SECRET, иначе bot token, иначе только local-dev (никогда AUTH_PIN).
  const sessionSecret =
    c.env?.SESSION_SECRET || env.SESSION_SECRET || botToken || "local-dev-session-secret";

  return {
    botToken,
    botUsername: c.env?.TELEGRAM_BOT_USERNAME || env.TELEGRAM_BOT_USERNAME || null,
    allowedIds: parseAllowedIds(c.env?.TELEGRAM_ALLOWED_IDS || env.TELEGRAM_ALLOWED_IDS),
    authPin,
    pinEnabled,
    sessionSecret,
    telegramEnabled: Boolean(botToken)
  };
}

export function createApp(customDb?: IDatabase) {
  const app = new Hono<{ Bindings: Bindings }>();

  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return CORS_ORIGINS[0];
        return CORS_ORIGINS.includes(origin) ? origin : null;
      },
      credentials: true
    })
  );

  // Хелпер создания контекста сервисов
  function getContext(c: any) {
    let db: IDatabase;
    if (customDb) {
      db = customDb;
    } else if (c.env?.DB) {
      db = new CloudflareD1Adapter(c.env.DB);
    } else {
      db = MemoryDatabaseAdapter.getInstance();
    }

    const postRepo = new D1PostRepository(db);
    const playbookRepo = new D1PlaybookRepository(db);
    const mediaRepo = new D1MediaRepository(db);
    const storage = c.env?.MEDIA_KV
      ? new KvObjectStorage(c.env.MEDIA_KV)
      : new MemoryObjectStorage();

    const envAny = processEnv();
    const geminiKey =
      c.req.header("x-gemini-key") ||
      c.env?.GEMINI_API_KEY ||
      c.env?.LLM_API_KEY ||
      envAny.GEMINI_API_KEY ||
      envAny.LLM_API_KEY;

    const aiService = new HybridAiService({
      cloudflareAi: c.env?.AI,
      geminiApiKey: geminiKey,
      preferredModel: c.req.header("x-gemini-model")
    });

    const postController = new PostController(postRepo);
    const playbookController = new PlaybookController(playbookRepo);
    const aiController = new AiController(aiService, playbookRepo);
    const mediaController = new MediaController(mediaRepo, storage);

    return { postController, playbookController, aiController, mediaController };
  }

  app.get("/api/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/auth/config", (c) => {
    const cfg = authConfig(c);
    return c.json({
      telegramEnabled: cfg.telegramEnabled,
      botUsername: cfg.telegramEnabled ? cfg.botUsername : null,
      pinEnabled: cfg.pinEnabled
    });
  });

  app.get("/api/auth/me", async (c) => {
    const cfg = authConfig(c);
    const token = readSessionCookie(c.req.header("Cookie"));
    if (token) {
      const user = await verifySessionToken(token, cfg.sessionSecret);
      if (user) return c.json({ authenticated: true, user });
    }
    return c.json({ authenticated: false, user: null });
  });

  app.post("/api/auth/telegram", async (c) => {
    const cfg = authConfig(c);
    if (!cfg.botToken) {
      return c.json({ error: "Telegram вход не настроен" }, 400);
    }
    try {
      const body = (await c.req.json()) as TelegramAuthPayload;
      const verified = await verifyTelegramLogin(body, cfg.botToken);
      if (!verified.ok) {
        return c.json({ error: verified.error }, 401);
      }
      if (cfg.allowedIds && !cfg.allowedIds.includes(verified.user.id)) {
        return c.json({ error: "Этот Telegram-аккаунт не допущен к студии" }, 403);
      }
      const session = await createSessionToken(verified.user, cfg.sessionSecret);
      const secure = new URL(c.req.url).protocol === "https:";
      c.header("Set-Cookie", sessionCookieHeader(session, secure));
      return c.json({ authenticated: true, user: verified.user });
    } catch (err: any) {
      return c.json({ error: err.message || "Ошибка входа" }, 400);
    }
  });

  app.post("/api/auth/pin", async (c) => {
    const cfg = authConfig(c);
    if (!cfg.pinEnabled) {
      return c.json({ error: "PIN-вход отключён" }, 400);
    }
    try {
      const { pin } = await c.req.json();
      if (String(pin || "") !== cfg.authPin) {
        return c.json({ error: "Неверный PIN" }, 401);
      }
      const user = { id: 0, firstName: "PIN", via: "pin" as const };
      const session = await createSessionToken(user, cfg.sessionSecret);
      const secure = new URL(c.req.url).protocol === "https:";
      c.header("Set-Cookie", sessionCookieHeader(session, secure));
      return c.json({ authenticated: true, user });
    } catch (err: any) {
      return c.json({ error: err.message || "Ошибка входа" }, 400);
    }
  });

  app.post("/api/auth/logout", (c) => {
    const secure = new URL(c.req.url).protocol === "https:";
    c.header("Set-Cookie", clearSessionCookieHeader(secure));
    return c.json({ ok: true });
  });

  // Auth Middleware — только cookie-сессия (PIN/Telegram лишь выдают cookie).
  app.use("/api/*", async (c, next) => {
    const path = c.req.path;
    if (
      path === "/api/health" ||
      path.startsWith("/api/auth/")
    ) {
      await next();
      return;
    }

    const cfg = authConfig(c);
    const needsAuth = cfg.telegramEnabled || cfg.pinEnabled;
    if (!needsAuth) {
      await next();
      return;
    }

    const cookieToken = readSessionCookie(c.req.header("Cookie"));
    if (cookieToken) {
      const user = await verifySessionToken(cookieToken, cfg.sessionSecret);
      if (user) {
        await next();
        return;
      }
    }

    return c.json({ error: "Unauthorized" }, 401);
  });

  // --- Posts Routes ---
  app.get("/api/posts", async (c) => {
    const { postController } = getContext(c);
    const query = c.req.query();
    const posts = await postController.getPosts(query);
    return c.json(posts);
  });

  app.get("/api/posts/:id", async (c) => {
    const { postController } = getContext(c);
    try {
      const post = await postController.getPost(c.req.param("id"));
      return c.json(post);
    } catch (err: any) {
      return c.json({ error: err.message }, 404);
    }
  });

  app.post("/api/posts", async (c) => {
    const { postController } = getContext(c);
    try {
      const body = await c.req.json();
      const post = await postController.createPost(body);
      return c.json(post, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.put("/api/posts/:id", async (c) => {
    const { postController } = getContext(c);
    try {
      const body = await c.req.json();
      const post = await postController.updatePost(c.req.param("id"), body);
      return c.json(post);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.patch("/api/posts/:id/status", async (c) => {
    const { postController } = getContext(c);
    try {
      const { status } = await c.req.json();
      const post = await postController.changeStatus(c.req.param("id"), status);
      return c.json(post);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.post("/api/posts/:id/variants", async (c) => {
    const { postController } = getContext(c);
    try {
      const body = await c.req.json();
      const post = await postController.addVariant(c.req.param("id"), body);
      return c.json(post, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.put("/api/posts/:id/variants/:variantId/select", async (c) => {
    const { postController } = getContext(c);
    try {
      const post = await postController.selectVariant(c.req.param("id"), c.req.param("variantId"));
      return c.json(post);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.delete("/api/posts/:id/variants/:variantId", async (c) => {
    const { postController, mediaController } = getContext(c);
    try {
      const variantId = c.req.param("variantId");
      await mediaController.deleteOwner("post_variant", variantId);
      const post = await postController.deleteVariant(c.req.param("id"), variantId);
      return c.json(post);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.delete("/api/posts/:id", async (c) => {
    const { postController, mediaController } = getContext(c);
    try {
      const id = c.req.param("id");
      try {
        const post = await postController.getPost(id);
        await mediaController.deleteOwner("post", id);
        for (const variant of post.variants || []) {
          await mediaController.deleteOwner("post_variant", variant.id);
        }
      } catch {
        await mediaController.deleteOwner("post", id);
      }
      await postController.deletePost(id);
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.get("/api/tags", async (c) => {
    const { postController } = getContext(c);
    const tags = await postController.getTags();
    return c.json(tags);
  });

  // --- Media (polymorphic: model_type + model_id) ---
  app.get("/api/media", async (c) => {
    const { mediaController } = getContext(c);
    try {
      const modelType = c.req.query("modelType") || "";
      const modelId = c.req.query("modelId") || "";
      const items = await mediaController.list(modelType, modelId);
      return c.json(items);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.post("/api/media", async (c) => {
    const { mediaController } = getContext(c);
    try {
      const form = await c.req.formData();
      const file = form.get("file") as File | null;
      if (!file || typeof (file as File).arrayBuffer !== "function") {
        return c.json({ error: "Файл не передан" }, 400);
      }
      const modelType = String(form.get("modelType") || "");
      const modelId = String(form.get("modelId") || "");
      const altText = String(form.get("altText") || "");
      const uploaded = await mediaController.upload({
        modelType,
        modelId,
        filename: file.name || "file",
        mimeType: file.type || "application/octet-stream",
        data: await file.arrayBuffer(),
        altText
      });
      return c.json(uploaded, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.patch("/api/media/:id/primary", async (c) => {
    const { mediaController } = getContext(c);
    try {
      const item = await mediaController.setPrimary(c.req.param("id"));
      return c.json(item);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.delete("/api/media/:id", async (c) => {
    const { mediaController } = getContext(c);
    try {
      await mediaController.delete(c.req.param("id"));
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.get("/api/media/:id/file", async (c) => {
    const { mediaController } = getContext(c);
    const file = await mediaController.getFile(c.req.param("id"));
    if (!file) {
      return c.json({ error: "Медиафайл не найден" }, 404);
    }
    return new Response(file.body, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
        "Cache-Control": "private, max-age=3600"
      }
    });
  });

  // --- Playbook Routes ---
  app.get("/api/playbook", async (c) => {
    const { playbookController } = getContext(c);
    const data = await playbookController.getPlaybook();
    return c.json(data);
  });

  app.post("/api/playbook/methodologies", async (c) => {
    const { playbookController } = getContext(c);
    try {
      const body = await c.req.json();
      const saved = await playbookController.saveMethodology(body);
      return c.json(saved, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.delete("/api/playbook/methodologies/:id", async (c) => {
    const { playbookController } = getContext(c);
    await playbookController.deleteMethodology(c.req.param("id"));
    return c.json({ success: true });
  });

  app.post("/api/playbook/tone", async (c) => {
    const { playbookController } = getContext(c);
    try {
      const body = await c.req.json();
      const saved = await playbookController.saveToneProfile(body);
      return c.json(saved);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  // --- AI Copilot Routes ---
  app.post("/api/ai/hooks", async (c) => {
    const { aiController } = getContext(c);
    try {
      const { text, count } = await c.req.json();
      const result = await aiController.generateHooks(text, count);
      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.post("/api/ai/polish", async (c) => {
    const { aiController } = getContext(c);
    try {
      const { text, instructions } = await c.req.json();
      const result = await aiController.polish(text, instructions);
      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.post("/api/ai/critique", async (c) => {
    const { aiController } = getContext(c);
    try {
      const { text } = await c.req.json();
      const result = await aiController.critique(text);
      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.post("/api/ai/thread", async (c) => {
    const { aiController } = getContext(c);
    try {
      const { text } = await c.req.json();
      const result = await aiController.expandToThread(text);
      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.post("/api/ai/test", async (c) => {
    const { aiController } = getContext(c);
    try {
      const result = await aiController.testConnection();
      return c.json(result);
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 400);
    }
  });

  app.all("*", async (c) => {
    if (c.env?.ASSETS) {
      return c.env.ASSETS.fetch(c.req.raw);
    }
    return c.text("Not found", 404);
  });

  return app;
}

const app = createApp();
export default app;
