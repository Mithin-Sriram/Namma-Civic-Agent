import OpenAI from "openai";
import { AI_CONFIG } from "@/config/ai";

let openRouterClient: OpenAI | null = null;

function getOpenRouterClient(): OpenAI {
  if (!openRouterClient) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }
    openRouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Namma-Civic-Agent",
      },
    });
  }
  return openRouterClient;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: "json_object" };
}

export async function openRouterChatCompletion(
  options: ChatOptions
): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const client = getOpenRouterClient();
  const response = await client.chat.completions.create({
    model: options.model || AI_CONFIG.openrouter.defaultModel,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? AI_CONFIG.openrouter.defaultTemperature,
    max_tokens: options.max_tokens ?? AI_CONFIG.openrouter.defaultMaxTokens,
    ...(options.response_format ? { response_format: options.response_format } : {}),
    stream: false,
  });

  return response.choices[0]?.message?.content || "";
}

export async function* openRouterChatStream(
  options: ChatOptions
): AsyncGenerator<string, void, unknown> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const client = getOpenRouterClient();
  const stream = await client.chat.completions.create({
    model: options.model || AI_CONFIG.openrouter.defaultModel,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? AI_CONFIG.openrouter.streaming.defaultTemperature,
    max_tokens: options.max_tokens ?? AI_CONFIG.openrouter.streaming.defaultMaxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
