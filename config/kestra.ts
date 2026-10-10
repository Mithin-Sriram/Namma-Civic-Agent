export const KESTRA_CONFIG = {
  url: process.env.KESTRA_URL || "http://localhost:8080",
  auth: process.env.KESTRA_AUTH || undefined,
  namespace: "namma-civic-agent",
  workflows: {
    weeklySchemeUpdates: "weekly-scheme-updates",
    eligibilityExtractor: "eligibility-rule-extractor",
    autocompleteSuggestions: "autocomplete-suggestions",
  },
  webhookKeys: {
    weeklySchemeUpdates: "weekly-scheme-updates-key",
    eligibilityExtractor: "eligibility-extractor-key",
    autocompleteSuggestions: "autocomplete-suggestions-key",
  },
  getWebhookUrl(workflowId: string, webhookKey: string): string {
    return `${this.url}/api/v1/executions/webhook/${this.namespace}/${workflowId}/${webhookKey}`;
  },
  isConfigured(): boolean {
    return !!this.url && this.url !== "http://localhost:8080" || process.env.NODE_ENV === "development";
  },
} as const;


