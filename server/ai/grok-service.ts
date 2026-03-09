/**
 * server/ai/grok-service.ts — xAI Grok
 *
 * FIXED: Full conversation history. Grok uses OpenAI-compatible API.
 */

import OpenAI from "openai";
import type { ChatOptions, ChatResult } from "./types";

const grokClient = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: process.env.XAI_API_KEY,
});

const DEFAULT_SYSTEM = `You are Grok, an AI assistant built by xAI. 
You have a witty, direct style and access to real-time context.
You're running inside Codexis, a multi-model AI platform.
Be sharp, insightful, and don't repeat what's already been said in the conversation.`;

export async function chatWithGrok(
  message: string,
  options: ChatOptions = {}
): Promise<ChatResult> {
  const start = Date.now();
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: options.systemPrompt || DEFAULT_SYSTEM },
      ...(options.history || []).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const response = await grokClient.chat.completions.create({
      model: "grok-2-1212",
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      model: "grok-2-1212",
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    console.error("Grok error:", error);
    return { content: "", model: "grok-2-1212", error: error.message, latencyMs: Date.now() - start };
  }
}
