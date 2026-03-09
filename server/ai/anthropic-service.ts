/**
 * server/ai/anthropic-service.ts — Claude Sonnet
 *
 * FIXED: Passes full conversation history. Claude now has memory of the thread.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ChatOptions, ChatResult } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEFAULT_SYSTEM = `You are Claude, an AI assistant made by Anthropic. 
You are running inside Codexis, a multi-model AI platform.
Be nuanced, precise, and genuinely insightful. Acknowledge uncertainty. 
Build meaningfully on the conversation — never repeat what you've already said.`;

export async function chatWithClaude(
  message: string,
  options: ChatOptions = {}
): Promise<ChatResult> {
  const start = Date.now();
  try {
    // Claude's API takes system separately; messages must strictly alternate user/assistant
    const rawHistory = options.history || [];

    // Collapse consecutive same-role messages (Claude API requirement)
    const normalized: Anthropic.MessageParam[] = [];
    for (const m of rawHistory) {
      if (m.role === "system") continue; // system goes in the top-level param
      const last = normalized[normalized.length - 1];
      if (last && last.role === m.role) {
        // Merge consecutive same-role turns
        last.content += "\n\n" + m.content;
      } else {
        normalized.push({ role: m.role as "user" | "assistant", content: m.content });
      }
    }
    // Add current user message
    normalized.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: options.maxTokens || 4096,
      system: options.systemPrompt || DEFAULT_SYSTEM,
      messages: normalized,
      temperature: options.temperature ?? 0.7,
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected content type from Claude");

    return {
      content: content.text,
      model: "claude-sonnet-4-5",
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    console.error("Claude error:", error);
    return { content: "", model: "claude-sonnet-4-5", error: error.message, latencyMs: Date.now() - start };
  }
}
