import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryDatabaseAdapter } from "../../../../shared/infrastructure/db/D1Database.ts";
import { D1PostRepository } from "../../infrastructure/D1PostRepository.ts";
import { ContentAiGenerator } from "../services/ContentAiGenerator.ts";
import { CreateContentFromConversationUseCase } from "../use-cases/CreateContentFromConversationUseCase.ts";
import { EditContentUseCase } from "../use-cases/EditContentUseCase.ts";
import { SelectVariantUseCase } from "../use-cases/SelectVariantUseCase.ts";
import { RegenerateContentUseCase } from "../use-cases/RegenerateContentUseCase.ts";
import { ActionExecutor } from "../../../telegram/application/ActionExecutor.ts";
import { TelegramContentPresenter } from "../../../telegram/presentation/TelegramContentPresenter.ts";
import type { ConversationContext } from "../../../telegram/domain/ChatSession.ts";
import type { IAiServiceWithHistory, AiResult } from "../../../ai-copilot/domain/services/IAiService.ts";

describe("Post → Variant → Version Lifecycle (22 required verification points)", () => {
  let db: MemoryDatabaseAdapter;
  let postRepo: D1PostRepository;
  let aiService: IAiServiceWithHistory;
  let aiGenerator: ContentAiGenerator;
  let createUseCase: CreateContentFromConversationUseCase;
  let selectUseCase: SelectVariantUseCase;
  let editUseCase: EditContentUseCase;
  let regenUseCase: RegenerateContentUseCase;
  let executor: ActionExecutor;

  // Mock AI responses mapped by call
  let mockAiResponses: string[] = [];
  let aiCallIndex = 0;

  beforeEach(() => {
    db = new MemoryDatabaseAdapter();
    postRepo = new D1PostRepository(db);
    mockAiResponses = [];
    aiCallIndex = 0;

    aiService = {
      chatWithHistory: vi.fn().mockImplementation(() => {
        const response = mockAiResponses[aiCallIndex] || "Default AI response";
        aiCallIndex++;
        return Promise.resolve({
          data: response,
          meta: { providerId: "test", modelId: "test-model", label: "Test", source: "llm" }
        } satisfies AiResult<string>);
      }),
      generateHooks: vi.fn(),
      polishContent: vi.fn(),
      critiqueContent: vi.fn(),
      expandToThread: vi.fn(),
      testConnection: vi.fn()
    } as unknown as IAiServiceWithHistory;

    aiGenerator = new ContentAiGenerator(aiService);
    createUseCase = new CreateContentFromConversationUseCase(postRepo, aiGenerator);
    selectUseCase = new SelectVariantUseCase(postRepo);
    editUseCase = new EditContentUseCase(postRepo, aiGenerator);
    regenUseCase = new RegenerateContentUseCase(postRepo, aiGenerator);

    executor = new ActionExecutor({
      useCases: {
        createContent: createUseCase,
        selectVariant: selectUseCase,
        editContent: editUseCase,
        regenerateContent: regenUseCase
      },
      presenter: new TelegramContentPresenter()
    });
  });

  it("Executes the complete 1-18 lifecycle: create 3 variants, select 3, edit 3 twice, select 1, edit 1", async () => {
    // ── 1. Create 3 variants ──
    mockAiResponses = [
      JSON.stringify({ hook: "Hook Var 1", body: "Body Var 1" }),
      JSON.stringify({ hook: "Hook Var 2", body: "Body Var 2" }),
      JSON.stringify({ hook: "Hook Var 3", body: "Body Var 3" })
    ];

    let context: ConversationContext = {};

    const createRes = await executor.execute(
      {
        action: "content.create",
        parameters: {
          topic: "AI Agents",
          variants: 3,
          tone: ["expert"],
          constraints: []
        }
      },
      context,
      "gemini-3.8-flash"
    );

    expect(createRes.contextUpdate).toBeDefined();
    context = { ...context, ...createRes.contextUpdate };
    const postId = context.postId!;
    expect(postId).toBeTruthy();

    const postAfterCreate = await postRepo.findById(postId);
    expect(postAfterCreate).toBeDefined();

    // ── 2. Verify 3 PostVariant ──
    const variants = postAfterCreate!.getVariants();
    expect(variants.length).toBe(3);

    // ── 3. Verify each has Version 1 ──
    for (let i = 0; i < 3; i++) {
      const v = variants[i];
      const versions = v.getVersions();
      expect(versions.length).toBe(1);
      expect(versions[0].versionNumber).toBe(1);
      expect(v.activeVersionId).toBe(versions[0].id);
    }
    expect(variants[0].hook).toBe("Hook Var 1");
    expect(variants[1].hook).toBe("Hook Var 2");
    expect(variants[2].hook).toBe("Hook Var 3");

    // ── 4. Verify first variant active ──
    expect(postAfterCreate!.activeVariantId).toBe(variants[0].id);
    expect(context.variantId).toBe(variants[0].id);
    expect(context.versionId).toBe(variants[0].getVersions()[0].id);

    // ── 5. Select variant 3 ──
    const select3Res = await executor.execute(
      {
        action: "content.select_variant",
        parameters: { variantNumber: 3 }
      },
      context,
      "gemini-3.8-flash"
    );

    context = { ...context, ...select3Res.contextUpdate };

    // ── 6. Verify context variantId = variant 3 ──
    const variant3 = variants[2];
    expect(context.variantId).toBe(variant3.id);

    // ── 7. Verify context versionId = variant 3 version 1 ──
    const var3V1 = variant3.getVersions()[0];
    expect(context.versionId).toBe(var3V1.id);

    const postAfterSelect = await postRepo.findById(postId);
    expect(postAfterSelect!.activeVariantId).toBe(variant3.id);

    // ── 8. Edit variant 3 ──
    mockAiResponses.push("Hook Var 3 - Revision 2\nBody Var 3 - Revision 2");
    const edit1Res = await executor.execute(
      {
        action: "content.edit",
        parameters: { instruction: "make beginning stronger" }
      },
      context,
      "gemini-3.8-flash"
    );

    context = { ...context, ...edit1Res.contextUpdate };

    const postAfterEdit1 = await postRepo.findById(postId);
    const postVar3AfterEdit1 = postAfterEdit1!.getVariantById(variant3.id)!;
    const var3VersionsAfterEdit1 = postVar3AfterEdit1.getVersions();

    // ── 9. Verify Version 1 unchanged ──
    expect(var3VersionsAfterEdit1[0].hook).toBe("Hook Var 3");
    expect(var3VersionsAfterEdit1[0].body).toBe("Body Var 3");

    // ── 10. Verify Version 2 created ──
    expect(var3VersionsAfterEdit1.length).toBe(2);
    expect(var3VersionsAfterEdit1[1].versionNumber).toBe(2);
    expect(var3VersionsAfterEdit1[1].hook).toBe("Hook Var 3 - Revision 2");
    expect(var3VersionsAfterEdit1[1].body).toBe("Body Var 3 - Revision 2");

    // ── 11. Verify Version 2 active ──
    expect(postVar3AfterEdit1.activeVersionId).toBe(var3VersionsAfterEdit1[1].id);
    expect(context.versionId).toBe(var3VersionsAfterEdit1[1].id);

    // ── 12. Edit again ──
    mockAiResponses.push("Hook Var 3 - Revision 3 (Short)\nBody Var 3 - Revision 3 (Short)");
    const edit2Res = await executor.execute(
      {
        action: "content.edit",
        parameters: { instruction: "make even shorter" }
      },
      context,
      "gemini-3.8-flash"
    );

    context = { ...context, ...edit2Res.contextUpdate };

    const postAfterEdit2 = await postRepo.findById(postId);
    const postVar3AfterEdit2 = postAfterEdit2!.getVariantById(variant3.id)!;
    const var3VersionsAfterEdit2 = postVar3AfterEdit2.getVersions();

    // ── 13. Verify Version 3 created ──
    expect(var3VersionsAfterEdit2.length).toBe(3);
    expect(var3VersionsAfterEdit2[2].versionNumber).toBe(3);
    expect(var3VersionsAfterEdit2[2].hook).toBe("Hook Var 3 - Revision 3 (Short)");

    // ── 14. Verify versions 1 and 2 unchanged ──
    expect(var3VersionsAfterEdit2[0].hook).toBe("Hook Var 3");
    expect(var3VersionsAfterEdit2[0].body).toBe("Body Var 3");
    expect(var3VersionsAfterEdit2[1].hook).toBe("Hook Var 3 - Revision 2");
    expect(var3VersionsAfterEdit2[1].body).toBe("Body Var 3 - Revision 2");
    expect(postVar3AfterEdit2.activeVersionId).toBe(var3VersionsAfterEdit2[2].id);

    // ── 15. Select variant 1 ──
    const select1Res = await executor.execute(
      {
        action: "content.select_variant",
        parameters: { variantNumber: 1 }
      },
      context,
      "gemini-3.8-flash"
    );

    context = { ...context, ...select1Res.contextUpdate };

    // ── 16. Verify context switches to variant 1/version 1 ──
    const variant1 = variants[0];
    expect(context.variantId).toBe(variant1.id);
    expect(context.versionId).toBe(variant1.getVersions()[0].id);

    const postAfterSelect1 = await postRepo.findById(postId);
    expect(postAfterSelect1!.activeVariantId).toBe(variant1.id);

    // ── 17. Edit variant 1 ──
    mockAiResponses.push("Hook Var 1 - V2\nBody Var 1 - V2");
    const editVar1Res = await executor.execute(
      {
        action: "content.edit",
        parameters: { instruction: "sharpen tone" }
      },
      context,
      "gemini-3.8-flash"
    );

    context = { ...context, ...editVar1Res.contextUpdate };

    const postAfterEditVar1 = await postRepo.findById(postId);
    const postVar1 = postAfterEditVar1!.getVariantById(variant1.id)!;
    expect(postVar1.getVersions().length).toBe(2);
    expect(postVar1.activeVersionId).toBe(postVar1.getVersions()[1].id);

    // ── 18. Verify variant 3 history remains untouched ──
    const postVar3Final = postAfterEditVar1!.getVariantById(variant3.id)!;
    const finalV3Versions = postVar3Final.getVersions();
    expect(finalV3Versions.length).toBe(3);
    expect(finalV3Versions[0].hook).toBe("Hook Var 3");
    expect(finalV3Versions[1].hook).toBe("Hook Var 3 - Revision 2");
    expect(finalV3Versions[2].hook).toBe("Hook Var 3 - Revision 3 (Short)");
    expect(postVar3Final.activeVersionId).toBe(finalV3Versions[2].id);
  });

  // ── 19. Invalid variant number ──
  it("19. Selecting invalid variant number (< 1 or > count) fails cleanly", async () => {
    mockAiResponses = [JSON.stringify({ hook: "H1", body: "B1" }), JSON.stringify({ hook: "H2", body: "B2" })];
    const created = (await createUseCase.execute({ topic: "T", variants: 2, tone: [], constraints: [] })).getValue();

    const selectBelow = await selectUseCase.execute({ postId: created.post.id, variantNumber: 0 });
    expect(selectBelow.isFailure).toBe(true);

    const selectAbove = await selectUseCase.execute({ postId: created.post.id, variantNumber: 99 });
    expect(selectAbove.isFailure).toBe(true);
    expect(selectAbove.getError()).toContain("Вариант 99 не существует");
  });

  // ── 20. Missing post ──
  it("20. Operating on missing post returns failure", async () => {
    const editRes = await editUseCase.execute({
      postId: "non-existent-post-id",
      instruction: "test"
    });
    expect(editRes.isFailure).toBe(true);
    expect(editRes.getError()).toContain("не найден");

    const selectRes = await selectUseCase.execute({
      postId: "non-existent-post-id",
      variantNumber: 1
    });
    expect(selectRes.isFailure).toBe(true);

    const regenRes = await regenUseCase.execute({
      postId: "non-existent-post-id"
    });
    expect(regenRes.isFailure).toBe(true);
  });

  // ── 21. Missing variant ──
  it("21. Editing with non-existent variantId on post returns failure", async () => {
    mockAiResponses = [JSON.stringify({ hook: "H", body: "B" })];
    const created = (await createUseCase.execute({ topic: "T", variants: 1, tone: [], constraints: [] })).getValue();

    const editRes = await editUseCase.execute({
      postId: created.post.id,
      variantId: "non-existent-variant-id",
      instruction: "make it punchier"
    });
    expect(editRes.isFailure).toBe(true);
    expect(editRes.getError()).toContain("Активный вариант не найден");
  });

  // ── 22. Concurrent / duplicate version number handling ──
  it("22. Version numbers are strictly monotonic and unique per variant", async () => {
    mockAiResponses = [JSON.stringify({ hook: "H", body: "B" })];
    const created = (await createUseCase.execute({ topic: "T", variants: 1, tone: [], constraints: [] })).getValue();
    const post = (await postRepo.findById(created.post.id))!;
    const variant = post.getVariants()[0];

    // Add multiple versions in succession
    const v2Res = variant.addVersion("H2", "B2");
    const v3Res = variant.addVersion("H3", "B3");
    const v4Res = variant.addVersion("H4", "B4");

    expect(v2Res.isSuccess).toBe(true);
    expect(v3Res.isSuccess).toBe(true);
    expect(v4Res.isSuccess).toBe(true);

    expect(v2Res.getValue().versionNumber).toBe(2);
    expect(v3Res.getValue().versionNumber).toBe(3);
    expect(v4Res.getValue().versionNumber).toBe(4);

    await postRepo.save(post);

    const reloaded = (await postRepo.findById(created.post.id))!;
    const reloadedVariant = reloaded.getVariants()[0];
    const numbers = reloadedVariant.getVersions().map((v) => v.versionNumber);
    expect(numbers).toEqual([1, 2, 3, 4]);

    // Check set of version numbers has no duplicates
    expect(new Set(numbers).size).toBe(4);
  });
});
