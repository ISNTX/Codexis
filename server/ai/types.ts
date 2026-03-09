/**
 * server/ai/types.ts
 *
 * Shared types for all AI services.
 * Every model gets full conversation history — no more stateless single-message calls.
 */

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;           // which AI sent this (for multi-model threads)
  name?: string;            // agent name in agenic mode
}

export interface ChatOptions {
  history?: ConversationMessage[];      // full prior conversation turns
  systemPrompt?: string;                // override the default system prompt
  temperature?: number;                 // 0.0 – 1.0
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResult {
  content: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  error?: string;
}

/**
 * Convert DB messages array to the format each AI service expects.
 * Strips model attribution from content — only role + text is passed.
 */
export function dbMessagesToHistory(
  dbMessages: Array<{ role: string; content: string; model?: string | null }>
): ConversationMessage[] {
  return dbMessages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      model: m.model ?? undefined,
    }));
}
