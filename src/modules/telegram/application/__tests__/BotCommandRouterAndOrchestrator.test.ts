import { describe, it, expect, vi, beforeEach } from "vitest";
import { BotCommandRouter, type BotContext, type TgUpdate } from "../BotCommandRouter.ts";

describe("BotCommandRouter & Conversational Routing", () => {
  let mockContext: BotContext;
  let sentMessages: Array<{ chatId: number; text: string; options?: any }>;

  beforeEach(() => {
    sentMessages = [];

    mockContext = {
      kvStore: {
        getSession: vi.fn().mockResolvedValue({
          chatId: 1001,
          modelId: "gemini-3.8-flash",
          history: [],
          context: {},
          updatedAt: new Date().toISOString()
        }),
        clearHistory: vi.fn().mockResolvedValue(undefined),
        setModel: vi.fn().mockResolvedValue(undefined),
        updateContext: vi.fn().mockResolvedValue(undefined)
      } as any,
      tgApi: {
        sendMessage: vi.fn().mockImplementation((chatId, text, options) => {
          sentMessages.push({ chatId, text, options });
          return Promise.resolve({ ok: true });
        }),
        setMyCommands: vi.fn().mockResolvedValue({ ok: true }),
        sendTyping: vi.fn().mockResolvedValue({ ok: true }),
        answerCallbackQuery: vi.fn().mockResolvedValue({ ok: true })
      } as any,
      chatWithAi: {
        execute: vi.fn().mockResolvedValue({ reply: "AI reply" })
      } as any,
      createPost: {
        execute: vi.fn().mockResolvedValue({
          postId: "p-1",
          hookText: "Hook created",
          bodyText: "Body created",
          modelLabel: "Gemini 3.8 Flash"
        })
      } as any,
      findPost: {
        execute: vi.fn().mockResolvedValue({
          telegramText: "Found 1 post"
        })
      } as any,
      orchestrator: {
        handle: vi.fn().mockResolvedValue("Orchestrated Reply for user text")
      } as any,
      allowedUserIds: null
    };
  });

  // ─── 8. Existing /commands continue to work ────────────────────────────────

  it("8a. /start command works and sends welcome message with command list", async () => {
    const router = new BotCommandRouter(mockContext);
    const update: TgUpdate = {
      update_id: 1,
      message: {
        message_id: 10,
        chat: { id: 1001, type: "private" },
        from: { id: 1001, first_name: "Amadeus" },
        text: "/start"
      }
    };

    await router.handle(update);

    expect(mockContext.tgApi.sendMessage).toHaveBeenCalled();
    expect(sentMessages[0].text).toContain("X\\-Manager Bot");
    expect(mockContext.tgApi.setMyCommands).toHaveBeenCalled();
  });

  it("8b. /newchat clears history and notifies user", async () => {
    const router = new BotCommandRouter(mockContext);
    const update: TgUpdate = {
      update_id: 2,
      message: {
        message_id: 11,
        chat: { id: 1001, type: "private" },
        from: { id: 1001, first_name: "Amadeus" },
        text: "/newchat"
      }
    };

    await router.handle(update);

    expect(mockContext.kvStore.clearHistory).toHaveBeenCalledWith(1001);
    expect(sentMessages[0].text).toContain("История чата очищена");
  });

  it("8c. /post <topic> invokes createPost usecase", async () => {
    const router = new BotCommandRouter(mockContext);
    const update: TgUpdate = {
      update_id: 3,
      message: {
        message_id: 12,
        chat: { id: 1001, type: "private" },
        from: { id: 1001, first_name: "Amadeus" },
        text: "/post Founders and writing"
      }
    };

    await router.handle(update);

    expect(mockContext.createPost.execute).toHaveBeenCalledWith({
      topic: "Founders and writing",
      modelId: "gemini-3.8-flash"
    });
    const lastMsg = sentMessages[sentMessages.length - 1];
    expect(lastMsg.text).toContain("Пост создан");
  });

  it("8d. /find <query> invokes findPost usecase", async () => {
    const router = new BotCommandRouter(mockContext);
    const update: TgUpdate = {
      update_id: 4,
      message: {
        message_id: 13,
        chat: { id: 1001, type: "private" },
        from: { id: 1001, first_name: "Amadeus" },
        text: "/find marketing"
      }
    };

    await router.handle(update);

    expect(mockContext.findPost.execute).toHaveBeenCalledWith({ query: "marketing" });
    const lastMsg = sentMessages[sentMessages.length - 1];
    expect(lastMsg.text).toContain("Found 1 post");
  });

  it("8e. /model opens inline keyboard model selector", async () => {
    const router = new BotCommandRouter(mockContext);
    const update: TgUpdate = {
      update_id: 5,
      message: {
        message_id: 14,
        chat: { id: 1001, type: "private" },
        from: { id: 1001, first_name: "Amadeus" },
        text: "/model"
      }
    };

    await router.handle(update);

    expect(mockContext.tgApi.sendMessage).toHaveBeenCalled();
    expect(sentMessages[0].text).toContain("Выбери AI\\-модель");
  });

  // ─── 9. Natural language continues to route through ConversationOrchestrator ─

  it("9. Natural language routes to ConversationOrchestrator.handle and replies to user", async () => {
    const router = new BotCommandRouter(mockContext);
    const update: TgUpdate = {
      update_id: 6,
      message: {
        message_id: 15,
        chat: { id: 1001, type: "private" },
        from: { id: 1001, first_name: "Amadeus" },
        text: "Сделай 3 поста про будущее AI"
      }
    };

    await router.handle(update);

    expect(mockContext.orchestrator.handle).toHaveBeenCalledWith(1001, "Сделай 3 поста про будущее AI");
    expect(mockContext.tgApi.sendMessage).toHaveBeenCalledWith(
      1001,
      "Orchestrated Reply for user text",
      { parse_mode: "MarkdownV2" }
    );
  });
});
