"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, X, Sparkles, Loader2, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSendMessage, useChatState } from "@/hooks";
import { InsightsSidebar } from "./InsightsSidebar";
import { FileUpload } from "./FileUpload";
import { MessageContent } from "./MessageContent";
import { CHAT_CONFIG } from "@/config/chat";
import type { TNInfoAttribution } from "@/lib/tn-info/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  attachments?: Array<{ id: string; filename: string; originalName: string; mimeType: string; size: number }>;
  tnInfo?: TNInfoAttribution;
}

interface ChatViewProps {
  chatId: string;
  initialMessages?: Message[];
  chatTitle?: string;
  initialQuery?: string;
}

function formatTNInfoTimestamp(value: string): string {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? value
    : `${timestamp.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

export function ChatView({ chatId, initialMessages = [], chatTitle, initialQuery }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ id: string; filename: string; originalName: string; mimeType: string; size: number }>>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollEnabled = useRef(true);
  const hasSetInitialQuery = useRef(false);
  const insightsManuallyClosed = useRef(false);
  const lastMessageCount = useRef(messages.length);
  
  useChatState({ chatId, chatTitle });

  const { message, setMessage, isLoading, sendMessage, handleKeyDown, inputRef } = useSendMessage({
    chatId,
    stream: true,
    fileIds: attachedFiles.map(f => f.id),
    onSuccess: (assistantMessage) => {
      setStreamingMessageId(null);
      setAttachedFiles([]);
      setMessages((prev) => {
        // Remove temp messages, streaming message, and any duplicate assistant message
        const filtered = prev.filter((m) => {
          if (m.id.startsWith("temp-")) return false;
          if (m.id === streamingMessageId) return false;
          if (m.id === assistantMessage.id) return false;
          return true;
        });
        return [...filtered, assistantMessage];
      });
      insightsManuallyClosed.current = false;
      autoScrollEnabled.current = true;
      setTimeout(() => {
        scrollToBottom();
        inputRef.current?.focus();
      }, 100);
    },
    onStreamChunk: (chunk: string, messageId: string) => {
      if (chunk.startsWith("__USER_MESSAGE_UPDATE__")) {
        try {
          const userMessageData = JSON.parse(chunk.replace("__USER_MESSAGE_UPDATE__", ""));
          setMessages((prev) => {
            const isTempMessage = userMessageData.id && userMessageData.id.startsWith("temp-");
            
            if (isTempMessage) {
              // Check if we already have this temp message (avoid duplicates)
              const existingTempIndex = prev.findIndex(m => m.id === userMessageData.id);
              if (existingTempIndex >= 0) {
                return prev; // Already exists, don't add again
              }
              return [...prev, {
                id: userMessageData.id,
                role: userMessageData.role,
                content: userMessageData.content,
                createdAt: new Date(userMessageData.createdAt),
                attachments: userMessageData.attachments || (attachedFiles.length > 0 ? attachedFiles : undefined),
              }];
            } else {
              // Real message from server - replace all temp user messages with this real one
              const filtered = prev.filter((m) => {
                // Remove all temp messages
                if (m.id.startsWith("temp-")) return false;
                // Also remove if it's a user message with the same ID (shouldn't happen, but safety check)
                if (m.id === userMessageData.id) return false;
                return true;
              });
              // Check if we already have this real message (avoid duplicates)
              const existingMessageIndex = filtered.findIndex(m => m.id === userMessageData.id);
              if (existingMessageIndex >= 0) {
                return filtered; // Already exists, don't add again
              }
              const newMessage = {
                id: userMessageData.id,
                role: userMessageData.role,
                content: userMessageData.content,
                createdAt: new Date(userMessageData.createdAt),
                attachments: userMessageData.attachments || (attachedFiles.length > 0 ? attachedFiles : undefined),
              };
              return [...filtered, newMessage];
            }
          });
        } catch (e) {
          console.error("Error parsing user message update:", e);
        }
        return;
      }

      setStreamingMessageId(messageId);
      setMessages((prev) => {
        const existingIndex = prev.findIndex((m) => m.id === messageId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            content: updated[existingIndex].content + chunk,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: messageId,
              role: "assistant" as const,
              content: chunk,
              createdAt: new Date(),
            },
          ];
        }
      });
      if (autoScrollEnabled.current) {
        setTimeout(() => scrollToBottom(false), 50);
      }
    },
    onTNInfo: (attribution, messageId) => {
      setMessages((prev) => prev.map((item) =>
        item.id === messageId ? { ...item, tnInfo: attribution } : item
      ));
    },
    onError: (errorMessage) => {
      setStreamingMessageId(null);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: errorMessage,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    },
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    autoScrollEnabled.current = true;
    setShowScrollButton(false);
  };

  useEffect(() => {
    if (autoScrollEnabled.current) {
      scrollToBottom(false);
    }
  }, [messages, streamingMessageId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (isNearBottom) {
        autoScrollEnabled.current = true;
        setShowScrollButton(false);
      } else {
        autoScrollEnabled.current = false;
        setShowScrollButton(true);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (initialQuery && initialQuery.trim() && messages.length === 0 && !hasSetInitialQuery.current) {
      setMessage(initialQuery.trim());
      hasSetInitialQuery.current = true;
    }
  }, [initialQuery, messages.length, setMessage]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachedFiles.length === 0) || isLoading) return;
    
    setMessage("");
    autoScrollEnabled.current = true;
    setTimeout(() => scrollToBottom(), 100);
    await sendMessage();
  };

  const handleKeyDownWrapper = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleKeyDown(e);
  };

  const sampleQueries = CHAT_CONFIG.sampleQueries;

  const handleSampleQueryClick = (query: string) => {
    setMessage(query);
    inputRef.current?.focus();
  };

  const emptyState = (
    <div className="flex h-full items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-3xl w-full">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h3 className="text-3xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Start a conversation
            </h3>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Ask about Tamil Nadu schemes, districts, public services, and civic processes.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs text-muted-foreground font-medium">
              Try these examples
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sampleQueries.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSampleQueryClick(item.text)}
                className={cn(
                  "group text-left p-4 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/30 transition-all duration-200 cursor-pointer",
                  "hover:shadow-md active:scale-[0.98]"
                )}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
                    {item.category}
                  </Badge>
                </div>
                <p className="text-sm font-medium leading-relaxed text-foreground">
                  {item.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const messagesList = (
    <div className="space-y-6 max-w-3xl mx-auto py-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted/80 text-foreground border border-border/50 rounded-bl-md"
            )}
          >
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {msg.attachments.map((file) => (
                  <Badge
                    key={file.id}
                    variant="secondary"
                    className="text-xs flex items-center gap-1.5"
                  >
                    <span className="text-base">
                      {file.mimeType.startsWith("image/") ? "🖼️" : 
                       file.mimeType === "application/pdf" ? "📄" : 
                       file.mimeType.includes("word") || file.mimeType.includes("document") ? "📝" : "📎"}
                    </span>
                    <span className="font-medium truncate max-w-[120px]">{file.originalName}</span>
                  </Badge>
                ))}
              </div>
            )}
            {msg.content && <MessageContent content={msg.content} isUser={msg.role === "user"} />}
            {msg.tnInfo && (
              <div className="mt-3 border-t border-border/60 pt-3 text-xs">
                <p className="font-medium">Source: TN-Info (independent, best-effort data)</p>
                <p className="mt-1 text-muted-foreground">{msg.tnInfo.note}</p>
                {msg.tnInfo.updatedAt && (
                  <p className="mt-1 text-muted-foreground">
                    Data updated: {formatTNInfoTimestamp(msg.tnInfo.updatedAt)}
                  </p>
                )}
                <p className="mt-1 text-muted-foreground">
                  {msg.tnInfo.status === "success" ? "Retrieved" : "Checked"}:{" "}
                  {formatTNInfoTimestamp(msg.tnInfo.retrievedAt)}
                </p>
                <ul className="mt-2 space-y-1">
                  {msg.tnInfo.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
      {isLoading && !streamingMessageId && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-3 shadow-sm bg-muted/80 text-foreground border border-border/50 rounded-bl-md">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const currentQuery = message || (messages[messages.length - 1]?.role === "user" ? messages[messages.length - 1].content : "");
  const hasInsights = currentQuery && currentQuery.length >= 10;

  useEffect(() => {
    const messageCountChanged = messages.length !== lastMessageCount.current;
    lastMessageCount.current = messages.length;
    
    if (messageCountChanged && messages.length > 0) {
      insightsManuallyClosed.current = false;
    }
    
    if (hasInsights && !showInsights && !insightsManuallyClosed.current) {
      const timer = setTimeout(() => {
        setShowInsights(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasInsights, showInsights, messages.length]);

  return (
    <div className="flex h-full flex-col relative">
      <div className="flex-1 overflow-hidden flex relative">
        <div className="flex-1 flex flex-col">
          <div 
            ref={messagesContainerRef}
            className={cn(
              "flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent relative transition-all duration-200"
            )}
          >
            <div className="absolute top-4 right-4 z-20">
              {hasInsights && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInsights(!showInsights)}
                  className={cn(
                    "h-8 w-8 rounded-full shadow-sm hover:shadow-md transition-all",
                    showInsights ? "bg-primary text-primary-foreground" : "bg-background/80 backdrop-blur-sm border border-border"
                  )}
                  aria-label={showInsights ? "Hide insights" : "Show insights"}
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
            </div>
            {messages.length === 0 ? emptyState : messagesList}
            <div ref={messagesEndRef} />
            {showScrollButton && (
              <div className="sticky bottom-4 flex justify-center z-10">
                <Button
                  onClick={() => scrollToBottom()}
                  size="icon"
                  className="rounded-full shadow-lg h-10 w-10 bg-primary hover:bg-primary/90"
                  aria-label="Scroll to bottom"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 flex items-center h-14 shrink-0">
            <div className="max-w-3xl mx-auto w-full flex items-center gap-2 h-full">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 border-r border-border/50 pr-2 mr-2">
              {attachedFiles.map((file) => (
                <Badge
                  key={file.id}
                  variant="secondary"
                  className="group flex items-center gap-2 px-2 py-1 text-xs"
                >
                  <span className="text-base">
                    {file.mimeType.startsWith("image/") ? "🖼️" : 
                     file.mimeType === "application/pdf" ? "📄" : 
                     file.mimeType.includes("word") || file.mimeType.includes("document") ? "📝" : "📎"}
                  </span>
                  <span className="font-medium truncate max-w-[100px]">{file.originalName}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles(prev => prev.filter(f => f.id !== file.id))}
                    className="p-0.5 hover:bg-destructive/20 hover:text-destructive rounded opacity-0 group-hover:opacity-100"
                    disabled={isLoading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDownWrapper}
            placeholder="Ask about any public service..."
            className="flex-1 h-10 pl-3 pr-3 rounded-lg border border-border bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all text-sm placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <FileUpload
            onFilesChange={(newFiles) => {
              setAttachedFiles(prev => [...prev, ...newFiles]);
            }}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend} 
            size="icon"
            disabled={isLoading || (!message.trim() && attachedFiles.length === 0)}
            aria-label="Send message"
            className="h-10 w-10 rounded-lg shadow-sm hover:shadow-md"
          >
            <Send className="h-4 w-4" />
          </Button>
            </div>
          </div>
        </div>
        {showInsights && hasInsights && (
          <InsightsSidebar 
            query={currentQuery} 
            className="w-80 hidden lg:flex"
            onClose={() => {
              setShowInsights(false);
              insightsManuallyClosed.current = true;
            }}
          />
        )}
      </div>
    </div>
  );
}
