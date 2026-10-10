export const AI_CONFIG = {
  openrouter: {
    defaultModel: "openai/gpt-4o-mini",
    defaultTemperature: 0.7,
    defaultMaxTokens: 1000,
    streaming: {
      defaultTemperature: 0.7,
      defaultMaxTokens: 1000,
    },
    classification: {
      temperature: 0.3,
      maxTokens: 50,
    },
    extraction: {
      temperature: 0.3,
      maxTokens: 500,
    },
    document: {
      temperature: 0.5,
      maxTokens: 2000,
    },
    title: {
      temperature: 0.3,
      maxTokens: 50,
    },
  },
} as const;
