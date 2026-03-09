/**
 * server/ai/meta-service.ts — Meta Llama 3 via OpenRouter
 *
 * FIXED: Full conversation history passed through OpenRouter.
 */

import OpenAI from "openai";
import type { ChatOptions, ChatResult } from "./types";

const SYSTEM_70B = `You are Llama 3 (70B), Meta's open-source AI model.
You run inside Codexis, a multi-model AI platform.
Be precise, structured, and genuinely analytical. Don't repeat prior conversation content.`;

const SYSTEM_405B = `You are Llama 3 (405B), Meta's most capable open-source model.
You run inside Codexis, a multi-model AI platform.
Bring deep reasoning and nuanced analysis. Build meaningfully on the thread.`;

function getOpenRouterClient() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_BASE_URL || "https://codexis.app",
      "X-Title": "Codexis",
    },
  });
}

export async function chatWithMetaLlama(
  message: string,
  variant: "70b" | "405b" = "70b",
  options: ChatOptions = {}
): Promise<ChatResult> {
  const start = Date.now();
  const client = getOpenRouterClient();
  const modelId = variant === "405b"
    ? "meta-llama/llama-3-405b-instruct"
    : "meta-llama/llama-3-70b-instruct";

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: options.systemPrompt || (variant === "405b" ? SYSTEM_405B : SYSTEM_70B) },
      ...(options.history || []).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const response = await client.chat.completions.create({
      model: modelId,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      model: modelId,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    console.error("Meta Llama error:", error);
    return { content: "", model: modelId, error: error.message, latencyMs: Date.now() - start };
  }
}


/**
 * server/ai/lux-service.ts — Lux Turbo via OpenRouter
 */
export async function chatWithLux(
  message: string,
  options: ChatOptions = {}
): Promise<ChatResult> {
  const start = Date.now();
  const client = getOpenRouterClient();

  const SYSTEM = `You are Lux Turbo, a high-speed AI assistant.
You run inside Codexis, a multi-model AI platform.
Be fast, clear, and useful. Continue the conversation naturally.`;

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: options.systemPrompt || SYSTEM },
      ...(options.history || []).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const response = await client.chat.completions.create({
      model: "nousresearch/nous-hermes-3-llama-8b",
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      model: "lux-turbo",
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    console.error("Lux error:", error);
    return { content: "", model: "lux-turbo", error: error.message, latencyMs: Date.now() - start };
  }
}
