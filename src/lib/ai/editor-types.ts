import type { TemplateExport } from "@/lib/templates/export-schema";

/**
 * A single message in the AI template editor chat.
 * Shared between the client shell and the server-side persistence layer.
 */
export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Hidden from the UI render (e.g. synthetic context turns) */
  hidden?: boolean;
  /** Hidden from the AI context (e.g. UI-language greeting) */
  hiddenFromAI?: boolean;
}

/**
 * A point-in-time snapshot of the template created when the AI applies a change.
 * `timestamp` is an ISO string used as the version label.
 */
export interface AiVersionSnapshot {
  timestamp: string;
  template: TemplateExport;
}
