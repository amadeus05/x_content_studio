import type { IPostRepository } from "../../content/domain/repositories/IPostRepository.ts";
import type { IAiServiceWithHistory } from "../../ai-copilot/domain/services/IAiService.ts";
import type { ConversationContext } from "../domain/ChatSession.ts";
import type { ParsedIntent, ActionResult } from "../domain/ConversationIntent.ts";
import { CreateContentFromConversationUseCase } from "../../content/application/use-cases/CreateContentFromConversationUseCase.ts";
import { EditContentUseCase } from "../../content/application/use-cases/EditContentUseCase.ts";
import { RegenerateContentUseCase } from "../../content/application/use-cases/RegenerateContentUseCase.ts";
import { SelectVariantUseCase } from "../../content/application/use-cases/SelectVariantUseCase.ts";
import { ContentAiGenerator } from "../../content/application/services/ContentAiGenerator.ts";
import { TelegramContentPresenter } from "../presentation/TelegramContentPresenter.ts";

export interface ActionExecutorUseCases {
  createContent: CreateContentFromConversationUseCase;
  editContent: EditContentUseCase;
  regenerateContent: RegenerateContentUseCase;
  selectVariant: SelectVariantUseCase;
}

export interface ActionExecutorDeps {
  postRepo?: IPostRepository;
  aiService?: IAiServiceWithHistory;
  useCases?: ActionExecutorUseCases;
  presenter?: TelegramContentPresenter;
}

/**
 * Thin dispatcher / orchestrator for conversational content actions.
 * Receives ParsedIntent, dispatches to application use cases, and formats response via presenter.
 */
export class ActionExecutor {
  private readonly useCases: ActionExecutorUseCases;
  private readonly presenter: TelegramContentPresenter;

  constructor(deps: ActionExecutorDeps) {
    this.presenter = deps.presenter ?? new TelegramContentPresenter();

    if (deps.useCases) {
      this.useCases = deps.useCases;
    } else if (deps.postRepo && deps.aiService) {
      const aiGenerator = new ContentAiGenerator(deps.aiService);
      this.useCases = {
        createContent: new CreateContentFromConversationUseCase(deps.postRepo, aiGenerator),
        editContent: new EditContentUseCase(deps.postRepo, aiGenerator),
        regenerateContent: new RegenerateContentUseCase(deps.postRepo, aiGenerator),
        selectVariant: new SelectVariantUseCase(deps.postRepo)
      };
    } else {
      throw new Error("ActionExecutor requires either useCases or both postRepo and aiService");
    }
  }

  public async execute(
    intent: ParsedIntent,
    context: ConversationContext,
    modelId: string
  ): Promise<ActionResult> {
    switch (intent.action) {
      case "content.create": {
        const res = await this.useCases.createContent.execute({
          topic: intent.parameters.topic,
          variants: intent.parameters.variants,
          tone: intent.parameters.tone,
          constraints: intent.parameters.constraints,
          modelId
        });

        if (res.isFailure) {
          return { reply: this.presenter.formatError(res.getError()) };
        }

        const data = res.getValue();
        return {
          reply: this.presenter.formatCreated(data.topic, data.variants, data.post.id),
          contextUpdate: {
            taskId: data.post.id,
            postId: data.post.id,
            variantId: data.activeVariantId,
            versionId: data.activeVersionId,
            intent: "content.create"
          }
        };
      }

      case "content.edit": {
        if (!context.postId) {
          return { reply: this.presenter.formatNoActivePost("edit") };
        }

        const res = await this.useCases.editContent.execute({
          postId: context.postId,
          variantId: context.variantId,
          instruction: intent.parameters.instruction,
          modelId
        });

        if (res.isFailure) {
          return { reply: this.presenter.formatError(res.getError()) };
        }

        const data = res.getValue();
        return {
          reply: this.presenter.formatEdited(data.hook, data.body, data.versionNumber),
          contextUpdate: {
            postId: data.postId,
            variantId: data.variantId,
            versionId: data.versionId,
            intent: "content.edit"
          }
        };
      }

      case "content.regenerate": {
        if (!context.postId) {
          return { reply: this.presenter.formatNoActivePost("regenerate") };
        }

        const res = await this.useCases.regenerateContent.execute({
          postId: context.postId,
          variantId: context.variantId,
          instruction: intent.parameters.instruction,
          modelId
        });

        if (res.isFailure) {
          return { reply: this.presenter.formatError(res.getError()) };
        }

        const data = res.getValue();
        return {
          reply: this.presenter.formatRegenerated(data.hook, data.body, data.versionNumber),
          contextUpdate: {
            postId: data.postId,
            variantId: data.variantId,
            versionId: data.versionId,
            intent: "content.regenerate"
          }
        };
      }

      case "content.select_variant": {
        if (!context.postId) {
          return { reply: this.presenter.formatNoActivePost("select_variant") };
        }

        const res = await this.useCases.selectVariant.execute({
          postId: context.postId,
          variantNumber: intent.parameters.variantNumber
        });

        if (res.isFailure) {
          return { reply: this.presenter.formatError(res.getError()) };
        }

        const data = res.getValue();
        return {
          reply: this.presenter.formatVariantSelected(
            data.variantNumber,
            data.selectedHook,
            data.selectedBody
          ),
          contextUpdate: {
            postId: data.post.id,
            variantId: data.variantId,
            versionId: data.versionId,
            intent: "content.select_variant"
          }
        };
      }

      case "content.show":
      case "content.find":
      case "content.schedule":
      case "content.publish":
        return {
          reply: this.presenter.formatStub(intent.action)
        };

      case "chat":
        return { reply: "" };
    }
  }
}
