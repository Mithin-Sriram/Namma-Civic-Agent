
import { openRouterChatCompletion, openRouterChatStream, AIMessage } from "./openrouter";
import {
  getChatMessages,
  CLASSIFICATION_PROMPT,
  EXTRACTION_PROMPT,
  DOCUMENT_PROMPT_TEMPLATES,
} from "./prompts";
import { AI_CONFIG } from "@/config/ai";
import { queryOumiModel } from "@/lib/oumi/service";
import { OUMI_CONFIG } from "@/config/oumi";

export async function getChatCompletion(
  userQuery: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [],
  useFineTuned: boolean = false,
  externalContext?: string
): Promise<string> {
  if (!externalContext && (useFineTuned || OUMI_CONFIG.enabled) && OUMI_CONFIG.isModelAvailable()) {
    try {
      const result = await queryOumiModel({
        query: userQuery,
        conversationHistory,
        useFineTuned: useFineTuned || OUMI_CONFIG.enabled,
      });
      return result.response;
    } catch (error) {
      console.error("Oumi model error, falling back to OpenRouter:", error);
    }
  }

  const messages = getChatMessages(userQuery, conversationHistory, externalContext);

  try {
    return await openRouterChatCompletion({ messages });
  } catch (error) {
    console.error("OpenRouter API error:", error);
    throw error;
  }
}

export async function* getChatStream(
  userQuery: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [],
  useFineTuned: boolean = false,
  externalContext?: string
): AsyncGenerator<string, void, unknown> {
  if (!externalContext && (useFineTuned || OUMI_CONFIG.enabled) && OUMI_CONFIG.isModelAvailable()) {
    try {
      const result = await queryOumiModel({
        query: userQuery,
        conversationHistory,
        useFineTuned: useFineTuned || OUMI_CONFIG.enabled,
      });
      
      for (const char of result.response) {
        yield char;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return;
    } catch (error) {
      console.error("Oumi model error, falling back to OpenRouter:", error);
    }
  }

  const messages = getChatMessages(userQuery, conversationHistory, externalContext);

  try {
    yield* openRouterChatStream({ messages });
  } catch (error) {
    console.error("OpenRouter streaming error:", error);
    const response = await getChatCompletion(userQuery, conversationHistory, useFineTuned, externalContext);
    for (const char of response) {
      yield char;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

export async function classifyQuery(query: string): Promise<string> {
  const prompt = CLASSIFICATION_PROMPT.replace("{query}", query);
  const messages: AIMessage[] = [
    { role: "system", content: "You are a query classification assistant. Respond with only the category name." },
    { role: "user", content: prompt },
  ];

  try {
    const response = await openRouterChatCompletion({
      messages,
      temperature: AI_CONFIG.openrouter.classification.temperature,
      max_tokens: AI_CONFIG.openrouter.classification.maxTokens,
    });
    return response.trim().toLowerCase();
  } catch (error) {
    console.error("Classification failed:", error);
    return "general_info";
  }
}

export async function extractEntities(query: string): Promise<{
  entities: string[];
  intent: string;
  key_points: string[];
  suggested_actions: string[];
}> {
  const prompt = EXTRACTION_PROMPT.replace("{query}", query);
  const messages: AIMessage[] = [
    { role: "system", content: "You are an entity extraction assistant. Return only valid JSON." },
    { role: "user", content: prompt },
  ];

  try {
    const response = await openRouterChatCompletion({
      messages,
      temperature: AI_CONFIG.openrouter.extraction.temperature,
      max_tokens: AI_CONFIG.openrouter.extraction.maxTokens,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      const normalizeStringList = (items: unknown): string[] => {
        if (!Array.isArray(items)) return [];
        return items
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (item && typeof item === "object") {
              const obj = item as Record<string, unknown>;
              if (typeof obj.name === "string" && obj.name.trim()) {
                return typeof obj.type === "string" && obj.type.trim()
                  ? `${obj.name.trim()} (${obj.type.trim()})`
                  : obj.name.trim();
              }
              const candidate = obj.point || obj.action || obj.text || obj.title || obj.description;
              if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
              const firstVal = Object.values(obj).find((v) => typeof v === "string" && v.trim());
              if (typeof firstVal === "string") return firstVal.trim();
            }
            return "";
          })
          .filter(Boolean);
      };

      const entities = Array.isArray(parsed.entities)
        ? normalizeStringList(parsed.entities)
        : parsed.entities && typeof parsed.entities === "object"
        ? Object.entries(parsed.entities).flatMap(([k, v]) =>
            Array.isArray(v)
              ? v.map((item) => (typeof item === "string" ? `${item.trim()} (${k})` : String(item)))
              : typeof v === "string"
              ? [`${v.trim()} (${k})`]
              : []
          )
        : [];

      const intent = typeof parsed.intent === "string"
        ? parsed.intent
        : (parsed.intent && typeof parsed.intent === "object" && typeof parsed.intent.name === "string"
            ? parsed.intent.name
            : "general_info");

      return {
        entities,
        intent,
        key_points: normalizeStringList(parsed.key_points),
        suggested_actions: normalizeStringList(parsed.suggested_actions),
      };
    }

    throw new Error("No JSON found in response");
  } catch (error) {
    console.error("Extraction failed:", error);
    return {
      entities: [],
      intent: "general_info",
      key_points: [],
      suggested_actions: [],
    };
  }
}

export async function generateDocument(
  type: "rti" | "complaint" | "eligibility_summary",
  params: Record<string, string>
): Promise<string> {
  const template = DOCUMENT_PROMPT_TEMPLATES[type];
  let prompt = template;

  for (const [key, value] of Object.entries(params)) {
    prompt = prompt.replace(`{${key}}`, value);
  }

  const messages: AIMessage[] = [
    { role: "system", content: "You are a document drafting assistant. Create well-formatted, professional documents." },
    { role: "user", content: prompt },
  ];

  try {
    return await openRouterChatCompletion({
      messages,
      temperature: AI_CONFIG.openrouter.document.temperature,
      max_tokens: AI_CONFIG.openrouter.document.maxTokens,
    });
  } catch (error) {
    console.error("Document generation failed:", error);
    throw error;
  }
}
