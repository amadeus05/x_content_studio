import type { IPostRepository } from "../../content/domain/repositories/IPostRepository.ts";
import type { IAiServiceWithHistory } from "../../ai-copilot/domain/services/IAiService.ts";
import type { ConversationContext } from "../domain/ChatSession.ts";
import type { ParsedIntent, ActionResult } from "../domain/ConversationIntent.ts";
import { CreatePostUseCase } from "../../content/application/use-cases/CreatePostUseCase.ts";
import { PostMapper } from "../../content/application/dtos/PostDto.ts";

// ─── System prompt для генерации контента ─────────────────────────────────────

const CONTENT_CREATION_SYSTEM_PROMPT = `Ты профессиональный копирайтер для X (Twitter) / Telegram.
Твоя задача — написать виральный пост.
Формат ответа — строго JSON (никаких markdown-блоков вокруг):
{
  "hook": "<цепляющий первый твит / заголовок, до 280 символов>",
  "body": "<основной текст поста, 1-5 абзацев>"
}
Пиши живо, конкретно, без воды.`;

function buildVariantSystemPrompt(tone: string[], variantIndex: number, totalVariants: number): string {
  const toneHint = tone.length > 0 ? `Тональность для этого варианта: ${tone.join(", ")}.` : "";
  return `${CONTENT_CREATION_SYSTEM_PROMPT}
${toneHint}
Это вариант ${variantIndex + 1} из ${totalVariants}. Сделай его кардинально отличным от других вариантов.`;
}

// ─── Deps interface ───────────────────────────────────────────────────────────

export interface ActionExecutorDeps {
  postRepo: IPostRepository;
  aiService: IAiServiceWithHistory;
}

// ─── ActionExecutor ───────────────────────────────────────────────────────────

/**
 * Выполняет распарсенный intent.
 *
 * Реальные: content.create, content.edit, content.regenerate, content.select_variant
 * Stub:     content.show, content.find, content.schedule, content.publish
 * Fallback: chat — не должен сюда попасть, но обрабатываем
 */
export class ActionExecutor {
  private readonly createPostUseCase: CreatePostUseCase;

  constructor(private readonly deps: ActionExecutorDeps) {
    this.createPostUseCase = new CreatePostUseCase(deps.postRepo);
  }

  public async execute(
    intent: ParsedIntent,
    context: ConversationContext,
    modelId: string
  ): Promise<ActionResult> {
    switch (intent.action) {
      case "content.create":
        return this.handleCreate(intent.parameters, modelId);

      case "content.edit":
        return this.handleEdit(intent.parameters.instruction, context, modelId);

      case "content.regenerate":
        return this.handleRegenerate(intent.parameters.instruction, context, modelId);

      case "content.select_variant":
        return this.handleSelectVariant(intent.parameters.variantNumber, context);

      case "content.show":
      case "content.find":
      case "content.schedule":
      case "content.publish":
        return {
          reply: `⚙️ Функция *${intent.action}* пока в разработке. Скоро появится!`
        };

      case "chat":
        // chat обрабатывается в оркестраторе напрямую через ChatWithAiUseCase
        return { reply: "" };
    }
  }

  // ─── content.create ────────────────────────────────────────────────────────

  private async handleCreate(
    params: { topic: string; variants: number; tone: string[]; constraints: string[] },
    modelId: string
  ): Promise<ActionResult> {
    const { topic, variants, tone } = params;
    const count = Math.max(1, Math.min(variants, 10));

    // Генерируем все варианты параллельно
    const generationPromises = Array.from({ length: count }, (_, i) =>
      this.generateVariant(topic, tone, i, count, modelId)
    );

    const results = await Promise.allSettled(generationPromises);

    const successful: Array<{ hook: string; body: string }> = [];
    for (const r of results) {
      if (r.status === "fulfilled") successful.push(r.value);
    }

    if (successful.length === 0) {
      return { reply: "❌ Не удалось сгенерировать контент. Попробуй ещё раз." };
    }

    // Создаём Post с первым вариантом
    const first = successful[0];
    const createResult = await this.createPostUseCase.execute({
      notes: topic,
      tags: ["telegram-bot", "conversational"],
      initialHook: first.hook,
      initialBody: first.body
    });

    if (createResult.isFailure) {
      return { reply: `❌ Ошибка создания поста: ${createResult.getError()}` };
    }

    const postDto = createResult.getValue();
    const post = await this.deps.postRepo.findById(postDto.id);
    if (!post) {
      return { reply: "❌ Пост создан, но не найден при загрузке." };
    }

    // Добавляем дополнительные варианты как hooks к тому же посту
    for (let i = 1; i < successful.length; i++) {
      const v = successful[i];
      post.addHook(v.hook, `Вариант ${i + 1}`);
      post.addBody(v.body, `Вариант ${i + 1}`);
    }
    await this.deps.postRepo.save(post);

    // Собираем финальный DTO для ответа
    const finalDto = PostMapper.toDto(post);
    const variantCount = successful.length;

    // Формируем ответ
    const lines: string[] = [
      `✍️ Создан пост на тему: *${esc(topic)}*\n`,
      `Сгенерировано вариантов: *${variantCount}*\n`
    ];

    for (let i = 0; i < successful.length; i++) {
      lines.push(`*Вариант ${i + 1}:*`);
      lines.push(esc(successful[i].hook));
      const bodyPreview = successful[i].body.slice(0, 200);
      lines.push(esc(bodyPreview) + (successful[i].body.length > 200 ? "…" : ""));
      lines.push("");
    }

    lines.push(`🆔 \`${finalDto.id}\``);

    if (variantCount > 1) {
      lines.push(`\n💡 Напиши *«Первый»*, *«Второй»* и т.д. чтобы выбрать вариант, или уточни что изменить.`);
    } else {
      lines.push(`\n💡 Напиши что изменить или *«поставь завтра на 12»* чтобы запланировать.`);
    }

    const activeHookId = finalDto.activeHookId;
    const activeBodyId = finalDto.activeBodyId;

    return {
      reply: lines.join("\n"),
      contextUpdate: {
        taskId: finalDto.id,
        postId: finalDto.id,
        variantId: activeHookId,
        versionId: activeBodyId,
        variantCount,
        intent: "content.create"
      }
    };
  }

  // ─── content.edit ──────────────────────────────────────────────────────────

  private async handleEdit(
    instruction: string,
    context: ConversationContext,
    modelId: string
  ): Promise<ActionResult> {
    if (!context.postId) {
      return {
        reply: "💬 Нет активного поста. Сначала создай контент, например:\n*«Сделай пост про AI-агентов»*"
      };
    }

    const post = await this.deps.postRepo.findById(context.postId);
    if (!post) {
      return { reply: "❌ Активный пост не найден. Возможно, он был удалён." };
    }

    const activeHook = post.getActiveHook();
    const activeBody = post.getActiveBody();
    const currentText = `${activeHook?.text || ""}\n\n${activeBody?.text || ""}`.trim();

    // Используем polishContent через chatWithHistory с кастомным промптом
    const editResult = await this.deps.aiService.chatWithHistory({
      messages: [{ role: "user", content: `Исходный текст:\n${currentText}` }],
      modelId,
      systemPrompt: `Ты редактор постов для X (Twitter).
Инструкция по доработке: ${instruction}
Правило: пост должен быть ритмичным, кратким (до 280 символов или около того), с сильным ритмом.
Верни ТОЛЬКО финальный текст — без пояснений.`
    });

    const newText = editResult.data.trim();

    // Обновляем hook (берём первую строку как hook, остальное как body)
    const lines = newText.split("\n").filter((l) => l.trim());
    const newHook = lines[0] || newText;
    const newBody = lines.slice(1).join("\n").trim() || newText;

    if (activeHook) {
      post.updateHook(activeHook.id, newHook);
    }
    if (activeBody) {
      post.updateBody(activeBody.id, newBody);
    }

    await this.deps.postRepo.save(post);

    return {
      reply: `✅ Вариант обновлён:\n\n${esc(newHook)}\n\n${esc(newBody.slice(0, 300))}${newBody.length > 300 ? "…" : ""}`,
      contextUpdate: { intent: "content.edit" }
    };
  }

  // ─── content.regenerate ────────────────────────────────────────────────────

  private async handleRegenerate(
    instruction: string | undefined,
    context: ConversationContext,
    modelId: string
  ): Promise<ActionResult> {
    if (!context.postId) {
      return {
        reply: "💬 Нет активного поста. Сначала создай контент."
      };
    }

    const post = await this.deps.postRepo.findById(context.postId);
    if (!post) {
      return { reply: "❌ Активный пост не найден." };
    }

    const topic = post.notes || "контент";
    const extraInstruction = instruction ? ` Учти: ${instruction}.` : "";

    const regenResult = await this.deps.aiService.chatWithHistory({
      messages: [{ role: "user", content: `Напиши пост на тему: "${topic}"${extraInstruction}` }],
      modelId,
      systemPrompt: CONTENT_CREATION_SYSTEM_PROMPT
    });

    const { hook, body } = parsePostJson(regenResult.data, topic);

    const activeHook = post.getActiveHook();
    const activeBody = post.getActiveBody();

    if (activeHook) post.updateHook(activeHook.id, hook);
    if (activeBody) post.updateBody(activeBody.id, body);

    await this.deps.postRepo.save(post);

    return {
      reply: `🔄 Вариант перегенерирован:\n\n*${esc(hook)}*\n\n${esc(body.slice(0, 300))}${body.length > 300 ? "…" : ""}`,
      contextUpdate: { intent: "content.regenerate" }
    };
  }

  // ─── content.select_variant ────────────────────────────────────────────────

  private async handleSelectVariant(
    variantNumber: number,
    context: ConversationContext
  ): Promise<ActionResult> {
    if (!context.postId) {
      return {
        reply: "💬 Не понимаю, из чего выбрать. Нет активного поста. Попробуй создать контент сначала."
      };
    }

    if (!context.variantCount || context.variantCount < 2) {
      return {
        reply: "💬 Сейчас только один вариант. Попроси создать несколько, например:\n*«Сделай 5 вариантов про AI»*"
      };
    }

    if (variantNumber > context.variantCount) {
      return {
        reply: `❌ Вариант ${variantNumber} не существует. Доступно: ${context.variantCount} вариантов.`
      };
    }

    const post = await this.deps.postRepo.findById(context.postId);
    if (!post) {
      return { reply: "❌ Активный пост не найден." };
    }

    // Хуки и тела упорядочены по orderIndex — выбираем по 1-based номеру
    const hooks = post.hooks.slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const bodies = post.bodies.slice().sort((a, b) => a.orderIndex - b.orderIndex);

    const targetHook = hooks[variantNumber - 1];
    const targetBody = bodies[variantNumber - 1];

    if (!targetHook) {
      return { reply: `❌ Вариант ${variantNumber} не найден.` };
    }

    post.selectHook(targetHook.id);
    if (targetBody) post.selectBody(targetBody.id);

    await this.deps.postRepo.save(post);

    const hookText = targetHook.text;
    const bodyText = targetBody?.text || "";

    return {
      reply: `✅ Выбран вариант *${variantNumber}*:\n\n*${esc(hookText)}*\n\n${esc(bodyText.slice(0, 300))}${bodyText.length > 300 ? "…" : ""}\n\n💡 Напиши что изменить, или *«поставь завтра на 12»* чтобы запланировать.`,
      contextUpdate: {
        variantId: targetHook.id,
        versionId: targetBody?.id,
        intent: "content.select_variant"
      }
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async generateVariant(
    topic: string,
    tone: string[],
    index: number,
    total: number,
    modelId: string
  ): Promise<{ hook: string; body: string }> {
    const systemPrompt = buildVariantSystemPrompt(tone, index, total);
    const result = await this.deps.aiService.chatWithHistory({
      messages: [{ role: "user", content: `Напиши пост на тему: "${topic}"` }],
      modelId,
      systemPrompt
    });
    return parsePostJson(result.data, topic);
  }
}

// ─── Module-level helpers ──────────────────────────────────────────────────

function parsePostJson(raw: string, fallbackTopic: string): { hook: string; body: string } {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { hook?: unknown; body?: unknown };
      if (typeof parsed.hook === "string" && typeof parsed.body === "string") {
        return {
          hook: parsed.hook.slice(0, 280),
          body: parsed.body
        };
      }
    } catch {
      // fall through
    }
  }
  return {
    hook: `🚀 ${fallbackTopic}`.slice(0, 280),
    body: raw.trim()
  };
}

function esc(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
