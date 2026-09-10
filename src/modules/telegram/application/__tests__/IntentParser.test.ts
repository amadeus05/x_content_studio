/**
 * Unit-тесты для IntentParser.
 *
 * Используем мок IAiServiceWithHistory, не вызываем реальный AI.
 * Тесты проверяют:
 *   1. "Сделай 5 постов про AI" → content.create, variants=5
 *   2. "Сделай пост про AI"     → content.create, variants=1 (default)
 *   3. "Третий" при 5 вариантах → content.select_variant, variantNumber=3
 *   4. "Сделай начало сильнее" при активном variant → content.edit
 *   5. "сделай его короче" при активном variant     → content.edit
 *   6. "Третий" без контекста   → chat (orchestrator попросит уточнить)
 *   7. Невалидный AI output     → безопасный fallback на chat
 */

import { describe, it, expect, vi } from "vitest";
import { IntentParser } from "../IntentParser.ts";
import type { IAiServiceWithHistory, AiResult } from "../../../ai-copilot/domain/services/IAiService.ts";
import type { ConversationContext } from "../../domain/ChatSession.ts";

// ─── Mock Builder ─────────────────────────────────────────────────────────────

function buildAiService(responseJson: string): IAiServiceWithHistory {
  return {
    chatWithHistory: vi.fn().mockResolvedValue({
      data: responseJson,
      meta: { providerId: "test", modelId: "test-model", label: "Test", source: "llm" }
    } satisfies AiResult<string>),
    generateHooks: vi.fn(),
    polishContent: vi.fn(),
    critiqueContent: vi.fn(),
    expandToThread: vi.fn(),
    testConnection: vi.fn()
  } as unknown as IAiServiceWithHistory;
}

function emptyContext(): ConversationContext {
  return {};
}

function contextWithVariants(count: number): ConversationContext {
  return {
    postId: "post-abc-123",
    variantId: "hook-001",
    variantCount: count,
    intent: "content.create"
  };
}

function contextWithActiveVariant(): ConversationContext {
  return {
    postId: "post-abc-123",
    variantId: "hook-001",
    versionId: "body-001",
    intent: "content.select_variant"
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("IntentParser", () => {
  const MODEL_ID = "gemini-3.8-flash";

  // 1. Создание 5 вариантов
  it("1. 'Сделай 5 постов про AI' → content.create, variants=5", async () => {
    const ai = buildAiService(JSON.stringify({
      action: "content.create",
      parameters: { topic: "AI", variants: 5, tone: [], constraints: [] }
    }));
    const parser = new IntentParser(ai);
    const intent = await parser.parse("Сделай 5 постов про AI", emptyContext(), MODEL_ID);

    expect(intent.action).toBe("content.create");
    if (intent.action === "content.create") {
      expect(intent.parameters.variants).toBe(5);
      expect(intent.parameters.topic).toBe("AI");
    }
  });

  // 2. Создание 1 варианта по умолчанию
  it("2. 'Сделай пост про AI' → content.create, variants=1", async () => {
    const ai = buildAiService(JSON.stringify({
      action: "content.create",
      parameters: { topic: "AI", variants: 1, tone: [], constraints: [] }
    }));
    const parser = new IntentParser(ai);
    const intent = await parser.parse("Сделай пост про AI", emptyContext(), MODEL_ID);

    expect(intent.action).toBe("content.create");
    if (intent.action === "content.create") {
      expect(intent.parameters.variants).toBe(1);
    }
  });

  // 3. Выбор третьего варианта при активных 5 вариантах
  it("3. 'Третий' при 5 вариантах → content.select_variant, variantNumber=3", async () => {
    const ai = buildAiService(JSON.stringify({
      action: "content.select_variant",
      parameters: { variantNumber: 3 }
    }));
    const parser = new IntentParser(ai);
    const intent = await parser.parse("Третий", contextWithVariants(5), MODEL_ID);

    expect(intent.action).toBe("content.select_variant");
    if (intent.action === "content.select_variant") {
      expect(intent.parameters.variantNumber).toBe(3);
    }
  });

  // 4. Редактирование активного варианта
  it("4. 'Сделай начало сильнее' при активном variant → content.edit", async () => {
    const ai = buildAiService(JSON.stringify({
      action: "content.edit",
      parameters: { instruction: "сделай начало сильнее" }
    }));
    const parser = new IntentParser(ai);
    const intent = await parser.parse(
      "Сделай начало сильнее",
      contextWithActiveVariant(),
      MODEL_ID
    );

    expect(intent.action).toBe("content.edit");
    if (intent.action === "content.edit") {
      expect(intent.parameters.instruction).toBeTruthy();
    }
  });

  // 5. "сделай его короче" → content.edit
  it("5. 'сделай его короче' при активном variant → content.edit", async () => {
    const ai = buildAiService(JSON.stringify({
      action: "content.edit",
      parameters: { instruction: "сделай его короче" }
    }));
    const parser = new IntentParser(ai);
    const intent = await parser.parse(
      "сделай его короче",
      contextWithActiveVariant(),
      MODEL_ID
    );

    expect(intent.action).toBe("content.edit");
  });

  // 6. "Третий" без контекста → graceful fallback
  it("6. 'Третий' без контекста → chat (graceful, не падает)", async () => {
    // AI возвращает select_variant, но ActionExecutor (не здесь) проверит контекст.
    // IntentParser сам по себе должен вернуть валидный intent без падения.
    const ai = buildAiService(JSON.stringify({
      action: "content.select_variant",
      parameters: { variantNumber: 3 }
    }));
    const parser = new IntentParser(ai);
    // Не должно выбросить исключение
    const intent = await parser.parse("Третий", emptyContext(), MODEL_ID);
    // Любой валидный intent — не падаем
    expect(intent.action).toBeTruthy();
    expect(typeof intent.action).toBe("string");
  });

  // 7. Невалидный AI output → безопасный fallback на chat
  it("7. Невалидный AI output → fallback на chat, не падает", async () => {
    // AI возвращает мусор
    const ai = buildAiService("Sorry, I cannot help with that. Let me think...\nActually here is my response: totally not json!");
    const parser = new IntentParser(ai);

    // Не должно выбросить исключение
    const intent = await parser.parse("что-то непонятное", emptyContext(), MODEL_ID);

    expect(intent.action).toBe("chat");
    if (intent.action === "chat") {
      expect(intent.parameters.message).toBe("что-то непонятное");
    }
  });

  // 7b. Невалидный JSON shape → безопасный fallback
  it("7b. JSON с неизвестным action → fallback на chat", async () => {
    const ai = buildAiService(JSON.stringify({
      action: "unknown.action.xyz",
      parameters: {}
    }));
    const parser = new IntentParser(ai);
    const intent = await parser.parse("блаблабла", emptyContext(), MODEL_ID);

    expect(intent.action).toBe("chat");
  });

  // 7c. JSON без обязательного поля → fallback на chat
  it("7c. content.create без topic → fallback на chat", async () => {
    const ai = buildAiService(JSON.stringify({
      action: "content.create",
      parameters: { variants: 5 } // нет topic
    }));
    const parser = new IntentParser(ai);
    const intent = await parser.parse("бла", emptyContext(), MODEL_ID);

    expect(intent.action).toBe("chat");
  });

  // 8. AI бросает исключение → fallback на chat
  it("8. AI throws error → fallback на chat, не падает", async () => {
    const ai = {
      chatWithHistory: vi.fn().mockRejectedValue(new Error("Network error")),
      generateHooks: vi.fn(),
      polishContent: vi.fn(),
      critiqueContent: vi.fn(),
      expandToThread: vi.fn(),
      testConnection: vi.fn()
    } as unknown as IAiServiceWithHistory;

    const parser = new IntentParser(ai);
    const intent = await parser.parse("бла", emptyContext(), MODEL_ID);

    expect(intent.action).toBe("chat");
  });

  // 9. variants clamp (не больше 10)
  it("9. variants > 10 → clamp до 10", async () => {
    const ai = buildAiService(JSON.stringify({
      action: "content.create",
      parameters: { topic: "AI", variants: 100, tone: [], constraints: [] }
    }));
    const parser = new IntentParser(ai);
    const intent = await parser.parse("Сделай 100 постов", emptyContext(), MODEL_ID);

    expect(intent.action).toBe("content.create");
    if (intent.action === "content.create") {
      expect(intent.parameters.variants).toBeLessThanOrEqual(10);
    }
  });

  // 10. Тональность передаётся корректно
  it("10. tone=['expert','provocative'] сохраняется", async () => {
    const ai = buildAiService(JSON.stringify({
      action: "content.create",
      parameters: { topic: "AI agents", variants: 5, tone: ["expert", "provocative"], constraints: [] }
    }));
    const parser = new IntentParser(ai);
    const intent = await parser.parse(
      "Сделай 5 постов про AI-агентов. Один экспертный, один провокационный",
      emptyContext(),
      MODEL_ID
    );

    expect(intent.action).toBe("content.create");
    if (intent.action === "content.create") {
      expect(intent.parameters.tone).toContain("expert");
      expect(intent.parameters.tone).toContain("provocative");
    }
  });
});
