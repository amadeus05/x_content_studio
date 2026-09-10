/**
 * Строго типизированные actions Conversational Orchestrator.
 *
 * Реализованы: content.create, content.edit, content.regenerate, content.select_variant
 * Stub (not implemented): content.show, content.find, content.schedule, content.publish
 * Fallback: chat (обычный AI чат)
 */

export type ContentAction =
  | "content.create"
  | "content.edit"
  | "content.regenerate"
  | "content.select_variant"
  | "content.show"
  | "content.find"
  | "content.schedule"
  | "content.publish";

export type ConversationAction = ContentAction | "chat";

// ─── Per-action parameter shapes ────────────────────────────────────────────

export interface ContentCreateParams {
  topic: string;
  variants: number;
  tone: string[];
  constraints: string[];
}

export interface ContentEditParams {
  instruction: string;
}

export interface ContentRegenerateParams {
  instruction?: string;
}

export interface ContentSelectVariantParams {
  variantNumber: number;
}

export interface ContentShowParams {
  // no params
}

export interface ContentFindParams {
  query: string;
}

export interface ContentScheduleParams {
  datetime: string;
}

export interface ContentPublishParams {
  // no params
}

export interface ChatParams {
  message: string;
}

// ─── Discriminated Union ─────────────────────────────────────────────────────

export type ParsedIntent =
  | { action: "content.create"; parameters: ContentCreateParams }
  | { action: "content.edit"; parameters: ContentEditParams }
  | { action: "content.regenerate"; parameters: ContentRegenerateParams }
  | { action: "content.select_variant"; parameters: ContentSelectVariantParams }
  | { action: "content.show"; parameters: ContentShowParams }
  | { action: "content.find"; parameters: ContentFindParams }
  | { action: "content.schedule"; parameters: ContentScheduleParams }
  | { action: "content.publish"; parameters: ContentPublishParams }
  | { action: "chat"; parameters: ChatParams };

// ─── Result of executing an action ───────────────────────────────────────────

import type { ConversationContext } from "./ChatSession.ts";

export interface ActionResult {
  /** Текст ответа пользователю */
  reply: string;
  /** Частичное обновление контекста (применяется через Object.assign) */
  contextUpdate?: Partial<ConversationContext>;
}
