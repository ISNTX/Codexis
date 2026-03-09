/**
 * server/ai/index.ts — Unified AI Router
 *
 * FIXED: All functions accept ChatOptions with history.
 * Routes properly to each provider. Returns ChatResult (not bare string).
 */

import { chatWithGPT } from "./openai-service";
import { chatWithClaude } from "./anthropic-service";
import { chatWithGrok } from "./grok-service";
import { chatWithGemini } from "./gemini-service";
import { chatWithMetaLlama, chatWithLux } from "./meta-service";
import { chatWithNexus, type SynthesisResult, type SynthesisModel } from "./synthetic-service";
import type { AIModel } from "@shared/schema";
import type { ChatOptions, ChatResult } from "./types";

export type { ChatOptions, ChatResult, ConversationMessage } from "./types";
export type { SynthesisResult, SynthesisModel } from "./synthetic-service";

export type ExtendedModel = AIModel | "gpt-4o" | "nexus";

// ── Single model ──────────────────────────────────────────────────────────────

export async function getChatResponse(
  model: ExtendedModel,
  message: string,
  options: ChatOptions = {}
): Promise<ChatResult> {
  switch (model) {
    case "gpt-4o":
    case "gpt-4o":
      return chatWithGPT(message, options);

    case "claude-sonnet-4-5":
      return chatWithClaude(message, options);

    case "grok-2-1212":
      return chatWithGrok(message, options);

    case "gemini-2-5-flash":
      return chatWithGemini(message, options);

    case "meta-llama-3-70b":
      return chatWithMetaLlama(message, "70b", options);

    case "meta-llama-3-405b":
      return chatWithMetaLlama(message, "405b", options);

    case "lux-turbo":
      return chatWithLux(message, options);

    case "nexus": {
      const result = await chatWithNexus(message, options);
      return {
        content: result.synthesis,
        model: "nexus",
        latencyMs: result.totalLatencyMs,
      };
    }

    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

// ── Parallel comparison ────────────────────────────────────────────────────────

export async function getComparisonResponses(
  models: ExtendedModel[],
  message: string,
  options: ChatOptions = {}
): Promise<Array<ChatResult & { model: ExtendedModel }>> {
  const results = await Promise.all(
    models.map(model => getChatResponse(model, message, options))
  );
  return results.map((r, i) => ({ ...r, model: models[i] }));
}

// ── NEXUS synthesis (full result with per-model breakdown) ──────────────────

export async function getNexusSynthesis(
  message: string,
  models?: SynthesisModel[],
  options: ChatOptions = {}
): Promise<SynthesisResult> {
  return chatWithNexus(message, { ...options, models });
}
