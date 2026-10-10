import { useState, useCallback, useRef, useEffect } from "react";
import type { TNInfoAttribution } from "@/lib/tn-info/types";
import type { WebSearchAttribution } from "@/lib/web-search/types";
import type { CivicWorkflow } from "@/lib/chat-workflow/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  tnInfo?: TNInfoAttribution;
  webSearch?: WebSearchAttribution;
  workflow?: CivicWorkflow;
}

interface UseSendMessageOptions {
  chatId: string;
  onSuccess?: (message: Message) => void;
  onError?: (error: string) => void;
  onStreamChunk?: (chunk: string, messageId: string) => void;
  onTNInfo?: (attribution: TNInfoAttribution, messageId: string) => void;
  onWebSearch?: (attribution: WebSearchAttribution, messageId: string) => void;
  onWorkflow?: (workflow: CivicWorkflow, messageId: string) => void;
  stream?: boolean;
  fileIds?: string[];
}

export function useSendMessage({ 
  chatId, 
  onSuccess, 
  onError,
  onStreamChunk,
  onTNInfo,
  onWebSearch,
  onWorkflow,
  stream = true,
  fileIds = []
}: UseSendMessageOptions) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = useCallback(async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && (!fileIds || fileIds.length === 0)) || isLoading) return null;

    // Create temp message for optimistic UI update
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: trimmedMessage,
      createdAt: new Date(),
    };

    // Add temp message to UI immediately for better UX
    if (onStreamChunk) {
      onStreamChunk(`__USER_MESSAGE_UPDATE__${JSON.stringify(tempUserMessage)}`, "");
    }

    setMessage("");
    setIsLoading(true);

    try {
      if (stream) {
        const response = await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: trimmedMessage, stream: true, fileIds }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantMessageId: string | null = null;
        let fullContent = "";
        let tnInfoAttribution: TNInfoAttribution | undefined;
        let webSearchAttribution: WebSearchAttribution | undefined;
        let civicWorkflow: CivicWorkflow | undefined;

        if (!reader) {
          throw new Error("No response body");
        }

        let savedUserMessage: Message | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                if (assistantMessageId && fullContent) {
                  const assistantMessage: Message = {
                    id: assistantMessageId,
                    role: "assistant",
                    content: fullContent,
                    createdAt: new Date(),
                    tnInfo: tnInfoAttribution,
                    webSearch: webSearchAttribution,
                    workflow: civicWorkflow,
                  };
                  onSuccess?.(assistantMessage);
                }
                setIsLoading(false);
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 50);
                return { success: true, userMessage: savedUserMessage || tempUserMessage };
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === 'userMessage' && parsed.userMessage) {
                  savedUserMessage = {
                    id: parsed.userMessage.id,
                    role: parsed.userMessage.role,
                    content: parsed.userMessage.content,
                    createdAt: new Date(parsed.userMessage.createdAt),
                  };
                  if (onStreamChunk) {
                    onStreamChunk?.(`__USER_MESSAGE_UPDATE__${JSON.stringify(savedUserMessage)}`, "");
                  }
                }
                
                if (parsed.type === 'chunk' && parsed.chunk) {
                  fullContent += parsed.chunk;
                  if (parsed.messageId) {
                    assistantMessageId = parsed.messageId;
                  }
                  onStreamChunk?.(parsed.chunk, parsed.messageId || "");
                }

                if (parsed.type === "error") {
                  const streamError = new Error(
                    typeof parsed.error === "string"
                      ? parsed.error
                      : "Unable to complete the response. Please try again."
                  );
                  streamError.name = "ChatStreamError";
                  throw streamError;
                }

                if (
                  parsed.type === "tnInfo" &&
                  parsed.attribution &&
                  typeof parsed.messageId === "string"
                ) {
                  tnInfoAttribution = parsed.attribution;
                  onTNInfo?.(parsed.attribution, parsed.messageId);
                }

                if (
                  parsed.type === "webSearch" &&
                  parsed.attribution &&
                  typeof parsed.messageId === "string"
                ) {
                  webSearchAttribution = parsed.attribution;
                  onWebSearch?.(parsed.attribution, parsed.messageId);
                }

                if (
                  parsed.type === "workflow" &&
                  parsed.workflow &&
                  typeof parsed.messageId === "string"
                ) {
                  civicWorkflow = parsed.workflow;
                  onWorkflow?.(parsed.workflow, parsed.messageId);
                }
              } catch (error) {
                if (error instanceof Error && error.name === "ChatStreamError") {
                  throw error;
                }
              }
            }
          }
        }
      } else {
        const response = await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: trimmedMessage, stream: false, fileIds }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();
        onSuccess?.(data.assistantMessage);
        setIsLoading(false);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
        return { success: true, userMessage: data.userMessage, assistantMessage: data.assistantMessage };
      }
    } catch (error) {
      const errorMessage = "Sorry, I encountered an error. Please try again.";
      onError?.(errorMessage);
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return { success: false, error: errorMessage, userMessage: tempUserMessage };
    }
  }, [message, isLoading, chatId, onSuccess, onError, onStreamChunk, onTNInfo, onWebSearch, onWorkflow, stream, fileIds]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isLoading && message.trim()) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage, isLoading, message]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current && !isLoading) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [chatId, isLoading]);

  return {
    message,
    setMessage,
    isLoading,
    sendMessage,
    handleKeyDown,
    inputRef,
  };
}
