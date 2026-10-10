export const OUMI_CONFIG = {
  modelUrl: process.env.OUMI_MODEL_URL || undefined,
  apiKey: process.env.OUMI_API_KEY || undefined,
  configPath: "./oumi/config.yaml",
  datasetPath: "./oumi/dataset.json",
  modelOutputPath: "./models/namma-civic-agent-finetuned",
  enabled: process.env.OUMI_ENABLED === "true" || false,
  training: {
    command: process.env.OUMI_COMMAND || "oumi",
    timeout: parseInt(process.env.OUMI_TRAINING_TIMEOUT || "7200000", 10),
  },
  isConfigured(): boolean {
    return this.enabled && !!this.modelUrl;
  },
  isModelAvailable(): boolean {
    return this.isConfigured();
  },
} as const;
