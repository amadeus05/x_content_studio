import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryDatabaseAdapter } from "../../../../shared/infrastructure/db/D1Database.ts";
import { D1PostRepository } from "../../infrastructure/D1PostRepository.ts";
import {
  ContentAiGenerator,
  parseAndValidatePostJson,
  isValidPostJson
} from "../services/ContentAiGenerator.ts";
import { CreateContentFromConversationUseCase } from "../use-cases/CreateContentFromConversationUseCase.ts";
import { EditContentUseCase } from "../use-cases/EditContentUseCase.ts";
import { RegenerateContentUseCase } from "../use-cases/RegenerateContentUseCase.ts";
import { SelectVariantUseCase } from "../use-cases/SelectVariantUseCase.ts";
import type { IAiServiceWithHistory, AiResult } from "../../../ai-copilot/domain/services/IAiService.ts";

describe("Conversation Content Use Cases & Validation", () => {
  let db: MemoryDatabaseAdapter;
  let postRepo: D1PostRepository;

  beforeEach(() => {
    db = new MemoryDatabaseAdapter();
    postRepo = new D1PostRepository(db);
  });

  function mockAi(responseText: string): IAiServiceWithHistory {
    return {
      chatWithHistory: vi.fn().mockResolvedValue({
        data: responseText,
        meta: { providerId: "test", modelId: "test-model", label: "Test", source: "llm" }
      } satisfies AiResult<string>),
      generateHooks: vi.fn(),
      polishContent: vi.fn(),
      critiqueContent: vi.fn(),
      expandToThread: vi.fn(),
      testConnection: vi.fn()
    } as unknown as IAiServiceWithHistory;
  }

  // ─── 6. Invalid AI JSON is handled safely ───────────────────────────────────

  describe("parseAndValidatePostJson & isValidPostJson", () => {
    it("safely handles valid JSON with hook and body", () => {
      const raw = JSON.stringify({
        hook: "Awesome hook line",
        body: "Detailed body text here."
      });
      const res = parseAndValidatePostJson(raw, "fallback");
      expect(res.hook).toBe("Awesome hook line");
      expect(res.body).toBe("Detailed body text here.");
    });

    it("safely falls back when JSON is malformed syntax", () => {
      const raw = "{ hook: not valid json at all ...";
      const res = parseAndValidatePostJson(raw, "AI Fallback Topic");
      expect(res.hook).toContain("AI Fallback Topic");
      expect(res.body).toBe(raw.trim());
    });

    it("safely falls back when JSON is missing body or hook", () => {
      const raw = JSON.stringify({ hook: "Only hook" });
      const res = parseAndValidatePostJson(raw, "Fallback Topic");
      expect(res.hook).toContain("Fallback Topic");
      expect(res.body).toBe(raw.trim());
    });

    it("safely falls back when hook is not a string (e.g. number or array)", () => {
      const raw = JSON.stringify({ hook: 12345, body: "Valid body" });
      const res = parseAndValidatePostJson(raw, "Fallback Topic");
      expect(res.hook).toContain("Fallback Topic");
    });

    it("isValidPostJson rejects non-objects, null, arrays, empty strings", () => {
      expect(isValidPostJson(null)).toBe(false);
      expect(isValidPostJson(undefined)).toBe(false);
      expect(isValidPostJson([])).toBe(false);
      expect(isValidPostJson("string")).toBe(false);
      expect(isValidPostJson({ hook: "", body: "Valid" })).toBe(false);
      expect(isValidPostJson({ hook: "Valid", body: "   " })).toBe(false);
      expect(isValidPostJson({ hook: "Valid", body: "Valid" })).toBe(true);
    });
  });

  // ─── 5. Business logic lives in use cases ───────────────────────────────────

  describe("CreateContentFromConversationUseCase", () => {
    it("creates a post with initial variant and adds extra variants to post model", async () => {
      const aiResponse = JSON.stringify({
        hook: "Generated Hook",
        body: "Generated Body paragraph."
      });
      const ai = mockAi(aiResponse);
      const aiGenerator = new ContentAiGenerator(ai);
      const useCase = new CreateContentFromConversationUseCase(postRepo, aiGenerator);

      const res = await useCase.execute({
        topic: "AI Agents in 2026",
        variants: 3,
        tone: ["expert"],
        constraints: []
      });

      expect(res.isSuccess).toBe(true);
      const data = res.getValue();
      expect(data.variants.length).toBe(3);
      expect(data.topic).toBe("AI Agents in 2026");

      const savedPost = await postRepo.findById(data.post.id);
      expect(savedPost).toBeDefined();
      expect(savedPost?.notes).toBe("AI Agents in 2026");
      expect(savedPost?.hooks.length).toBe(3);
      expect(savedPost?.bodies.length).toBe(3);
    });
  });

  describe("EditContentUseCase", () => {
    it("updates active hook and body with TODO for versioning", async () => {
      const ai = mockAi("New Edited Hook\nNew Edited Body Line");
      const aiGenerator = new ContentAiGenerator(ai);
      const createUseCase = new CreateContentFromConversationUseCase(
        postRepo,
        new ContentAiGenerator(mockAi(JSON.stringify({ hook: "H1", body: "B1" })))
      );
      const created = (await createUseCase.execute({
        topic: "Test",
        variants: 1,
        tone: [],
        constraints: []
      })).getValue();

      const editUseCase = new EditContentUseCase(postRepo, aiGenerator);
      const res = await editUseCase.execute({
        postId: created.post.id,
        instruction: "make it punchier"
      });

      expect(res.isSuccess).toBe(true);
      const updated = res.getValue();
      expect(updated.updatedHook).toBe("New Edited Hook");
      expect(updated.updatedBody).toBe("New Edited Body Line");

      const reloaded = await postRepo.findById(created.post.id);
      expect(reloaded?.getActiveHook()?.text).toBe("New Edited Hook");
    });
  });

  describe("RegenerateContentUseCase", () => {
    it("regenerates active hook and body on existing post", async () => {
      const regenAi = mockAi(JSON.stringify({ hook: "Regenerated Hook", body: "Regenerated Body" }));
      const aiGenerator = new ContentAiGenerator(regenAi);

      const createUseCase = new CreateContentFromConversationUseCase(
        postRepo,
        new ContentAiGenerator(mockAi(JSON.stringify({ hook: "Old Hook", body: "Old Body" })))
      );
      const created = (await createUseCase.execute({
        topic: "Old Topic",
        variants: 1,
        tone: [],
        constraints: []
      })).getValue();

      const regenUseCase = new RegenerateContentUseCase(postRepo, aiGenerator);
      const res = await regenUseCase.execute({
        postId: created.post.id,
        instruction: "more aggressive"
      });

      expect(res.isSuccess).toBe(true);
      const data = res.getValue();
      expect(data.hook).toBe("Regenerated Hook");
      expect(data.body).toBe("Regenerated Body");

      const reloaded = await postRepo.findById(created.post.id);
      expect(reloaded?.getActiveHook()?.text).toBe("Regenerated Hook");
    });
  });

  // ─── 7. Selecting non-existing variant fails on post model ──────────────────

  describe("SelectVariantUseCase", () => {
    it("selects valid variant by 1-based index", async () => {
      const createUseCase = new CreateContentFromConversationUseCase(
        postRepo,
        new ContentAiGenerator(mockAi(JSON.stringify({ hook: "H", body: "B" })))
      );
      const created = (await createUseCase.execute({
        topic: "Multi",
        variants: 3,
        tone: [],
        constraints: []
      })).getValue();

      const selectUseCase = new SelectVariantUseCase(postRepo);
      const res = await selectUseCase.execute({
        postId: created.post.id,
        variantNumber: 2
      });

      expect(res.isSuccess).toBe(true);
      const data = res.getValue();
      expect(data.variantNumber).toBe(2);
      expect(data.variantId).toBeTruthy();

      const post = await postRepo.findById(created.post.id);
      expect(post?.activeVariantId).toBe(data.variantId);
    });

    it("fails when selecting non-existing variant number (> real hooks count)", async () => {
      const createUseCase = new CreateContentFromConversationUseCase(
        postRepo,
        new ContentAiGenerator(mockAi(JSON.stringify({ hook: "H", body: "B" })))
      );
      // Create post with only 2 variants
      const created = (await createUseCase.execute({
        topic: "Only Two",
        variants: 2,
        tone: [],
        constraints: []
      })).getValue();

      const selectUseCase = new SelectVariantUseCase(postRepo);

      // Attempt to select 5th variant
      const res = await selectUseCase.execute({
        postId: created.post.id,
        variantNumber: 5
      });

      expect(res.isFailure).toBe(true);
      expect(res.getError()).toContain("Вариант 5 не существует");
      expect(res.getError()).toContain("Доступно: 2");
    });

    it("fails when selecting variantNumber <= 0", async () => {
      const createUseCase = new CreateContentFromConversationUseCase(
        postRepo,
        new ContentAiGenerator(mockAi(JSON.stringify({ hook: "H", body: "B" })))
      );
      const created = (await createUseCase.execute({
        topic: "Two",
        variants: 2,
        tone: [],
        constraints: []
      })).getValue();

      const selectUseCase = new SelectVariantUseCase(postRepo);
      const res = await selectUseCase.execute({
        postId: created.post.id,
        variantNumber: 0
      });

      expect(res.isFailure).toBe(true);
    });
  });
});
