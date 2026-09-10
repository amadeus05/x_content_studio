import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionExecutor, type ActionExecutorUseCases } from "../ActionExecutor.ts";
import { TelegramContentPresenter } from "../../presentation/TelegramContentPresenter.ts";
import { Result } from "../../../../shared/domain/Result.ts";
import type { PostDto } from "../../../content/application/dtos/PostDto.ts";
import type { ParsedIntent } from "../../domain/ConversationIntent.ts";
import type { ConversationContext } from "../../domain/ChatSession.ts";

describe("ActionExecutor Dispatcher", () => {
  let mockUseCases: ActionExecutorUseCases;
  let presenter: TelegramContentPresenter;
  let executor: ActionExecutor;

  const samplePostDto: PostDto = {
    id: "post-123",
    status: "DRAFT",
    activeVariantId: "hook-1",
    activeHookId: "hook-1",
    activeBodyId: "body-1",
    tags: ["tag1"],
    notes: "AI Note",
    tweetUrl: "",
    metrics: {},
    scheduledFor: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hooks: [
      { id: "hook-1", postId: "post-123", text: "Hook 1", label: "Var 1", pinnedBodyId: null, charCount: 6, orderIndex: 0, createdAt: "", updatedAt: "" },
      { id: "hook-2", postId: "post-123", text: "Hook 2", label: "Var 2", pinnedBodyId: null, charCount: 6, orderIndex: 1, createdAt: "", updatedAt: "" }
    ],
    bodies: [
      { id: "body-1", postId: "post-123", text: "Body 1", label: "Body 1", charCount: 6, orderIndex: 0, createdAt: "", updatedAt: "" },
      { id: "body-2", postId: "post-123", text: "Body 2", label: "Body 2", charCount: 6, orderIndex: 1, createdAt: "", updatedAt: "" }
    ]
  } as unknown as PostDto;

  beforeEach(() => {
    mockUseCases = {
      createContent: {
        execute: vi.fn().mockResolvedValue(
          Result.ok({
            post: samplePostDto,
            topic: "AI Agent topic",
            variants: [
              { hook: "Hook 1", body: "Body 1" },
              { hook: "Hook 2", body: "Body 2" }
            ],
            activeVariantId: "var-1",
            activeVersionId: "ver-1"
          })
        )
      } as any,
      editContent: {
        execute: vi.fn().mockResolvedValue(
          Result.ok({
            post: samplePostDto,
            postId: "post-123",
            variantId: "var-1",
            versionId: "ver-2",
            versionNumber: 2,
            hook: "Edited Hook Text",
            body: "Edited Body Text"
          })
        )
      } as any,
      regenerateContent: {
        execute: vi.fn().mockResolvedValue(
          Result.ok({
            post: samplePostDto,
            postId: "post-123",
            variantId: "var-1",
            versionId: "ver-3",
            versionNumber: 3,
            hook: "Regen Hook Text",
            body: "Regen Body Text"
          })
        )
      } as any,
      selectVariant: {
        execute: vi.fn().mockResolvedValue(
          Result.ok({
            post: samplePostDto,
            variantNumber: 2,
            variantId: "var-2",
            versionId: "ver-1",
            selectedHook: "Hook 2",
            selectedBody: "Body 2",
            hook: "Hook 2",
            body: "Body 2"
          })
        )
      } as any
    };

    presenter = new TelegramContentPresenter();
    executor = new ActionExecutor({ useCases: mockUseCases, presenter });
  });

  // 1. ActionExecutor dispatches content.create
  it("1. ActionExecutor dispatches content.create to CreateContentFromConversationUseCase", async () => {
    const intent: ParsedIntent = {
      action: "content.create",
      parameters: {
        topic: "AI Agent topic",
        variants: 2,
        tone: ["expert"],
        constraints: []
      }
    };

    const result = await executor.execute(intent, {}, "gemini-3.8-flash");

    expect(mockUseCases.createContent.execute).toHaveBeenCalledWith({
      topic: "AI Agent topic",
      variants: 2,
      tone: ["expert"],
      constraints: [],
      modelId: "gemini-3.8-flash"
    });

    expect(result.reply).toContain("Создан пост на тему");
    expect(result.reply).toContain("Hook 1");
    expect(result.contextUpdate?.postId).toBe("post-123");
    expect(result.contextUpdate?.variantId).toBe("var-1");
    expect(result.contextUpdate?.versionId).toBe("ver-1");
    expect(result.contextUpdate?.intent).toBe("content.create");
  });

  // 2. ActionExecutor dispatches content.edit
  it("2. ActionExecutor dispatches content.edit to EditContentUseCase", async () => {
    const intent: ParsedIntent = {
      action: "content.edit",
      parameters: { instruction: "make it punchier" }
    };
    const context: ConversationContext = { postId: "post-123", variantId: "var-1" };

    const result = await executor.execute(intent, context, "gemini-3.8-flash");

    expect(mockUseCases.editContent.execute).toHaveBeenCalledWith({
      postId: "post-123",
      variantId: "var-1",
      instruction: "make it punchier",
      modelId: "gemini-3.8-flash"
    });

    expect(result.reply).toContain("Вариант обновлён");
    expect(result.reply).toContain("Edited Hook Text");
    expect(result.contextUpdate?.variantId).toBe("var-1");
    expect(result.contextUpdate?.versionId).toBe("ver-2");
    expect(result.contextUpdate?.intent).toBe("content.edit");
  });

  it("2b. content.edit returns prompt to create post if context has no postId", async () => {
    const intent: ParsedIntent = {
      action: "content.edit",
      parameters: { instruction: "make it punchier" }
    };

    const result = await executor.execute(intent, {}, "gemini-3.8-flash");
    expect(mockUseCases.editContent.execute).not.toHaveBeenCalled();
    expect(result.reply).toContain("Нет активного поста");
  });

  // 3. ActionExecutor dispatches content.regenerate
  it("3. ActionExecutor dispatches content.regenerate to RegenerateContentUseCase", async () => {
    const intent: ParsedIntent = {
      action: "content.regenerate",
      parameters: { instruction: "try something different" }
    };
    const context: ConversationContext = { postId: "post-123", variantId: "var-1" };

    const result = await executor.execute(intent, context, "gemini-3.8-flash");

    expect(mockUseCases.regenerateContent.execute).toHaveBeenCalledWith({
      postId: "post-123",
      variantId: "var-1",
      instruction: "try something different",
      modelId: "gemini-3.8-flash"
    });

    expect(result.reply).toContain("Вариант перегенерирован");
    expect(result.reply).toContain("Regen Hook Text");
    expect(result.contextUpdate?.variantId).toBe("var-1");
    expect(result.contextUpdate?.versionId).toBe("ver-3");
    expect(result.contextUpdate?.intent).toBe("content.regenerate");
  });

  // 4. ActionExecutor dispatches content.select_variant
  it("4. ActionExecutor dispatches content.select_variant to SelectVariantUseCase", async () => {
    const intent: ParsedIntent = {
      action: "content.select_variant",
      parameters: { variantNumber: 2 }
    };
    const context: ConversationContext = {
      postId: "post-123",
      variantId: "var-1"
    };

    const result = await executor.execute(intent, context, "gemini-3.8-flash");

    expect(mockUseCases.selectVariant.execute).toHaveBeenCalledWith({
      postId: "post-123",
      variantNumber: 2
    });

    expect(result.reply).toContain("Выбран вариант *2*");
    expect(result.contextUpdate?.variantId).toBe("var-2");
    expect(result.contextUpdate?.versionId).toBe("ver-1");
    expect(result.contextUpdate?.intent).toBe("content.select_variant");
  });

  // 7. Selecting non-existing variant fails even if context is provided
  it("7. Selecting non-existing variant fails when use case fails", async () => {
    // Mock the usecase failing because the real post object does not contain variant #5
    (mockUseCases.selectVariant.execute as any).mockResolvedValueOnce(
      Result.fail("Вариант 5 не существует. Доступно: 2 вариантов.")
    );

    const intent: ParsedIntent = {
      action: "content.select_variant",
      parameters: { variantNumber: 5 }
    };
    const context: ConversationContext = {
      postId: "post-123"
    };

    const result = await executor.execute(intent, context, "gemini-3.8-flash");

    expect(mockUseCases.selectVariant.execute).toHaveBeenCalledWith({
      postId: "post-123",
      variantNumber: 5
    });
    expect(result.reply).toContain("❌ Вариант 5 не существует. Доступно: 2 вариантов.");
  });

  it("handles stub actions gracefully", async () => {
    const intent: ParsedIntent = {
      action: "content.publish",
      parameters: {}
    };

    const result = await executor.execute(intent, {}, "gemini-3.8-flash");
    expect(result.reply).toContain("в разработке");
  });
});
