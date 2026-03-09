/**
 * server/ai/gemini-service.ts — Google Gemini
 *
 * FIXED: Uses Gemini's multi-turn chat API with full history.
 * Gemini has a different API shape — history is passed to startChat().
 */

import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import type { ChatOptions, ChatResult } from "./types";

const DEFAULT_SYSTEM = `You are Gemini, Google's AI assistant. You are fast, factual, and precise.
You're running inside Codexis, a multi-model AI platform.
Be thorough but efficient. Build on the conversation — don't restate what's already been covered.`;

export async function chatWithGemini(
  message: string,
  options: ChatOptions = {}
): Promise<ChatResult> {
  const start = Date.now();
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: options.systemPrompt || DEFAULT_SYSTEM,
    });

    // Convert history to Gemini's Content[] format
    // Gemini requires strict user/model alternation
    const geminiHistory: Content[] = [];
    const rawHistory = options.history || [];

    for (const m of rawHistory) {
      if (m.role === "system") continue;
      // Map "assistant" → "model" for Gemini
      const role = m.role === "assistant" ? "model" : "user";
      const last = geminiHistory[geminiHistory.length - 1];
      if (last && last.role === role) {
        // Merge consecutive same-role turns
        (last.parts[0] as any).text += "\n\n" + m.content;
      } else {
        geminiHistory.push({ role, parts: [{ text: m.content }] });
      }
    }

    // Gemini requires history to end with a model turn if it has content
    // and the last message must be from the user — handled by startChat then sendMessage
    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(message);
    const content = result.response.text();

    return {
      content,
      model: "gemini-2.0-flash",
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    console.error("Gemini error:", error);
    return { content: "", model: "gemini-2.0-flash", error: error.message, latencyMs: Date.now() - start };
  }
}
