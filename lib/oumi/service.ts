import { OUMI_CONFIG } from "@/config/oumi";
import { openRouterChatCompletion } from "@/lib/ai/openrouter";
import type { AIMessage } from "@/lib/ai/openrouter";
import { CIVIC_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export interface OumiQueryRequest {
  query: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  useFineTuned?: boolean;
}

export interface OumiQueryResponse {
  response: string;
  model: "oumi" | "openrouter";
  timestamp: Date;
}

export async function queryOumiModel(
  request: OumiQueryRequest
): Promise<OumiQueryResponse> {
  const { query, conversationHistory = [], useFineTuned = false } = request;

  const shouldUseOumi = useFineTuned || OUMI_CONFIG.isModelAvailable();

  if (shouldUseOumi && OUMI_CONFIG.modelUrl) {
    try {
      const response = await queryOumiAPI(query, conversationHistory);
      return {
        response,
        model: "oumi",
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Oumi model query failed, falling back to OpenRouter:", error);
    }
  }

  const messages: AIMessage[] = [
    {
      role: "system",
      content: CIVIC_SYSTEM_PROMPT,
    },
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    {
      role: "user",
      content: query,
    },
  ];

  const response = await openRouterChatCompletion({ messages });

  return {
    response,
    model: "openrouter",
    timestamp: new Date(),
  };
}

async function queryOumiAPI(
  query: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  if (!OUMI_CONFIG.modelUrl) {
    throw new Error("Oumi model URL not configured");
  }

  const response = await fetch(`${OUMI_CONFIG.modelUrl}/api/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(OUMI_CONFIG.apiKey && { Authorization: `Bearer ${OUMI_CONFIG.apiKey}` }),
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: CIVIC_SYSTEM_PROMPT,
        },
        ...conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user",
          content: query,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Oumi API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || data.message || data.text || "";
}

export async function checkOumiModelStatus(): Promise<{
  available: boolean;
  modelUrl?: string;
  error?: string;
}> {
  if (!OUMI_CONFIG.isConfigured()) {
    return {
      available: false,
      error: "Oumi not configured. Set OUMI_MODEL_URL and OUMI_ENABLED=true",
    };
  }

  if (!OUMI_CONFIG.modelUrl) {
    return {
      available: false,
      error: "Oumi model URL not set",
    };
  }

  try {
    const response = await fetch(`${OUMI_CONFIG.modelUrl}/health`, {
      method: "GET",
      headers: {
        ...(OUMI_CONFIG.apiKey && { Authorization: `Bearer ${OUMI_CONFIG.apiKey}` }),
      },
    });

    if (response.ok) {
      return {
        available: true,
        modelUrl: OUMI_CONFIG.modelUrl,
      };
    }

    return {
      available: false,
      modelUrl: OUMI_CONFIG.modelUrl,
      error: `Health check failed: ${response.statusText}`,
    };
  } catch (error: any) {
    return {
      available: false,
      modelUrl: OUMI_CONFIG.modelUrl,
      error: error.message || "Failed to connect to Oumi model",
    };
  }
}
