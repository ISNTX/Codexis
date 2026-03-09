/**
 * server/ai/synthetic-service.ts — NEXUS Synthetic AI
 *
 * Real implementation:
 * 1. Dispatches to all selected models IN PARALLEL with full conversation history
 * 2. Collects genuine responses from each model
 * 3. Claude acts as the meta-synthesizer — reads all responses and produces
 *    a unified answer that identifies agreements, resolves disagreements,
 *    and combines the strongest elements from each model
 * 4. Returns per-model breakdown + synthesis + confidence metrics
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AIModel } from "@shared/schema";
import type { ChatOptions, ChatResult, ConversationMessage } from "./types";
import { chatWithGPT } from "./openai-service";
import { chatWithClaude } from "./anthropic-service";
import { chatWithGrok } from "./grok-service";
import { chatWithGemini } from "./gemini-service";
import { chatWithMetaLlama } from "./meta-service";
import { chatWithLux } from "./meta-service";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type SynthesisModel = AIModel | "gpt-4o";

export interface ModelResult {
  model: SynthesisModel;
  displayName: string;
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  error?: string;
}

export interface SynthesisResult {
  models: ModelResult[];
  synthesis: string;
  agreements: string[];       // Points all models agreed on
  divergences: string[];      // Points where models differed
  consensusScore: number;     // 0-100
  synthesisLatencyMs: number;
  totalLatencyMs: number;
}

const MODEL_DISPLAY_NAMES: Partial<Record<string, string>> = {
  "gpt-4o": "GPT-4o",
  "gpt-5": "GPT-5",
  "claude-sonnet-4-5": "Claude Sonnet",
  "grok-2-1212": "Grok 2",
  "gemini-2-5-flash": "Gemini Flash",
  "gemini-2.0-flash": "Gemini Flash",
  "meta-llama-3-70b": "Llama 3 (70B)",
  "meta-llama-3-405b": "Llama 3 (405B)",
  "lux-turbo": "Lux Turbo",
};

const DEFAULT_MODELS: SynthesisModel[] = [
  "gpt-4o",
  "claude-sonnet-4-5",
  "grok-2-1212",
  "gemini-2-5-flash",
];

// ── Dispatch to individual model ──────────────────────────────────────────────

async function callModel(
  model: SynthesisModel,
  message: string,
  options: ChatOptions
): Promise<ModelResult> {
  let result: ChatResult;

  switch (model) {
    case "gpt-4o":
      result = await chatWithGPT(message, options);
      break;
    case "claude-sonnet-4-5":
      result = await chatWithClaude(message, options);
      break;
    case "grok-2-1212":
      result = await chatWithGrok(message, options);
      break;
    case "gemini-2-5-flash":
      result = await chatWithGemini(message, options);
      break;
    case "meta-llama-3-70b":
      result = await chatWithMetaLlama(message, "70b", options);
      break;
    case "meta-llama-3-405b":
      result = await chatWithMetaLlama(message, "405b", options);
      break;
    case "lux-turbo":
      result = await chatWithLux(message, options);
      break;
    default:
      result = { content: "", model, error: `Unknown model: ${model}`, latencyMs: 0 };
  }

  return {
    model,
    displayName: MODEL_DISPLAY_NAMES[result.model] || model,
    content: result.content,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
    error: result.error,
  };
}

// ── NEXUS synthesis prompt ─────────────────────────────────────────────────────

function buildSynthesisPrompt(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  modelResponses: ModelResult[]
): string {
  const successfulResponses = modelResponses.filter(r => !r.error && r.content.trim());

  const historyContext = conversationHistory.length > 0
    ? `\n\n## Prior Conversation Context\n${
        conversationHistory
          .slice(-6) // last 3 exchanges
          .map(m => `${m.role === "user" ? "User" : `AI (${m.model || "assistant"})`}: ${m.content}`)
          .join("\n\n")
      }`
    : "";

  const responseBlocks = successfulResponses
    .map(r => `### ${r.displayName}\n${r.content}`)
    .join("\n\n---\n\n");

  return `You are NEXUS, a meta-intelligence synthesizer. You have collected responses from ${successfulResponses.length} AI models for the same question.

Your task is to synthesize them into one unified, superior response.

## User's Question
${userMessage}
${historyContext}

## Individual Model Responses
${responseBlocks}

## Instructions
Analyze all responses carefully, then produce a structured synthesis:

1. **AGREEMENTS** — What do all (or most) models agree on? List as bullet points. Be specific.
2. **DIVERGENCES** — Where do models meaningfully disagree? What's the best-supported position and why?
3. **SYNTHESIS** — The definitive unified answer. This should be better than any individual response:
   - More complete than any single model
   - Resolves contradictions with reasoning
   - Credits specific models when their unique insight adds value (e.g. "Grok noted...")
   - Directly answers the question without padding

Format your response exactly like this:

<agreements>
- [point 1]
- [point 2]
</agreements>

<divergences>
- [divergence 1 and resolution]
</divergences>

<synthesis>
[The full unified response here]
</synthesis>

<consensus_score>[number 0-100 reflecting how much models agreed]</consensus_score>`;
}

// ── Parse structured synthesis output ────────────────────────────────────────

function parseSynthesisOutput(raw: string): {
  agreements: string[];
  divergences: string[];
  synthesis: string;
  consensusScore: number;
} {
  const extract = (tag: string) => {
    const match = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
    return match ? match[1].trim() : "";
  };

  const agreements = extract("agreements")
    .split("\n")
    .filter(l => l.trim().startsWith("-"))
    .map(l => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);

  const divergences = extract("divergences")
    .split("\n")
    .filter(l => l.trim().startsWith("-"))
    .map(l => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);

  const synthesis = extract("synthesis") || raw;

  const scoreMatch = raw.match(/<consensus_score>(\d+)<\/consensus_score>/);
  const consensusScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 75;

  return { agreements, divergences, synthesis, consensusScore };
}

// ── Main NEXUS function ───────────────────────────────────────────────────────

export async function chatWithNexus(
  message: string,
  options: ChatOptions & { models?: SynthesisModel[] } = {}
): Promise<SynthesisResult> {
  const totalStart = Date.now();
  const models = options.models || DEFAULT_MODELS;

  // Each model gets the conversation history but uses its own system identity
  const modelOptions: ChatOptions = {
    history: options.history,
    temperature: 0.7,
    maxTokens: 2048,
    // Don't inject NEXUS system prompt into individual models — let each be themselves
  };

  // 1. Dispatch ALL models in parallel — genuine concurrent requests
  console.log(`[NEXUS] Dispatching to ${models.length} models in parallel...`);
  const modelResults = await Promise.all(
    models.map(model => callModel(model, message, modelOptions))
  );

  const successful = modelResults.filter(r => !r.error && r.content.trim());
  console.log(`[NEXUS] Got ${successful.length}/${models.length} successful responses`);

  if (successful.length === 0) {
    throw new Error("All models failed to respond. Check your API keys.");
  }

  if (successful.length === 1) {
    // Only one model responded — skip synthesis, return directly
    return {
      models: modelResults,
      synthesis: successful[0].content,
      agreements: [],
      divergences: [],
      consensusScore: 100,
      synthesisLatencyMs: 0,
      totalLatencyMs: Date.now() - totalStart,
    };
  }

  // 2. Run Claude as the synthesizer
  const synthStart = Date.now();
  const synthesisPrompt = buildSynthesisPrompt(
    message,
    options.history || [],
    successful
  );

  const synthesisResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: "You are NEXUS, a meta-intelligence synthesizer. Follow the user's formatting instructions exactly.",
    messages: [{ role: "user", content: synthesisPrompt }],
    temperature: 0.3, // Lower temp for synthesis = more consistent output
  });

  const rawSynthesis = synthesisResponse.content[0]?.type === "text"
    ? synthesisResponse.content[0].text
    : "";

  const { agreements, divergences, synthesis, consensusScore } = parseSynthesisOutput(rawSynthesis);

  return {
    models: modelResults,
    synthesis,
    agreements,
    divergences,
    consensusScore,
    synthesisLatencyMs: Date.now() - synthStart,
    totalLatencyMs: Date.now() - totalStart,
  };
}
