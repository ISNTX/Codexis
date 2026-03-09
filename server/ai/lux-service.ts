import OpenAI from "openai";

// This is using Replit's AI Integrations service for Lux models
// Reference: blueprint:javascript_openrouter_ai_integrations

let luxClient: OpenAI | null = null;

function getLuxClient(): OpenAI {
  if (!luxClient) {
    luxClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }
  return luxClient;
}

export async function chatWithLux(message: string): Promise<string> {
  try {
    const client = getLuxClient();
    const response = await client.chat.completions.create({
      model: "nousresearch/nous-hermes-3-llama-8b",
      messages: [{ role: "user", content: message }],
      max_tokens: 8192,
    });

    return response.choices[0]?.message?.content || "No response generated";
  } catch (error: any) {
    console.error("Lux error:", error);
    throw new Error(`Lux error: ${error.message}`);
  }
}
