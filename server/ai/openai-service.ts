/**
 * server/ai/openai-service.ts — GPT-4o / GPT-5
 *
 * FIXED: Accepts full conversation history so GPT actually remembers what was said.
 */

import OpenAI from "openai";
import type { ChatOptions, ChatResult } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEFAULT_SYSTEM = `You are GPT, a highly capable AI assistant built by OpenAI. 
You are operating inside Codexis, a multi-model AI platform. 
Be accurate, thoughtful, and genuinely helpful. 
When you don't know something, say so. Don't repeat prior answers verbatim — build on the conversation.`;

export async function chatWithGPT(
  message: string,
  options: ChatOptions = {}
): Promise<ChatResult> {
  const start = Date.now();
  try {
    // Build full message array: system + history + new user message
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: options.systemPrompt || DEFAULT_SYSTEM },
      // Inject conversation history (supports multi-turn memory)
      ...(options.history || []).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: options.temperature ?? 0.7,
      max_completion_tokens: options.maxTokens || 4096,
    });

    const content = response.choices[0]?.message?.content || "";
    return {
      content,
      model: "gpt-4o",
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    console.error("GPT error:", error);
    return { content: "", model: "gpt-4o", error: error.message, latencyMs: Date.now() - start };
  }
}
