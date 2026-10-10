export const CHAT_CONFIG = {
  sampleQueries: [
    {
      text: "What government schemes are available in Tamil Nadu?",
      category: "Tamil Nadu Schemes",
    },
    {
      text: "Tell me about the Madurai district",
      category: "District Info",
    },
    {
      text: "What are the TNEA counselling rounds?",
      category: "Education",
    },
    {
      text: "Show me public events in Madurai",
      category: "Local Events",
    },
    {
      text: "Show me the 2024 election information for Madurai district",
      category: "Election Info",
    },
    {
      text: "How can I report an uncollected garbage issue in Chennai?",
      category: "Civic Services",
    },
  ],
  conversationHistoryLimit: 10,
  messageHistoryLimit: 20,
  defaultChatTitle: "New Chat",
  maxTitleLength: 50,
} as const;
