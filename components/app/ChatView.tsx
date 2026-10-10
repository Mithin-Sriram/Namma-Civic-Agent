"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, X, Sparkles, Loader2, ChevronDown, Info, ListChecks, Circle, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSendMessage, useChatState } from "@/hooks";
import { InsightsSidebar } from "./InsightsSidebar";
import { FileUpload } from "./FileUpload";
import { MessageContent } from "./MessageContent";
import { CHAT_CONFIG } from "@/config/chat";
import type { TNInfoAttribution } from "@/lib/tn-info/types";
import type { WebSearchAttribution } from "@/lib/web-search/types";
import type { CivicWorkflow } from "@/lib/chat-workflow/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  attachments?: Array<{ id: string; filename: string; originalName: string; mimeType: string; size: number }>;
  tnInfo?: TNInfoAttribution;
  webSearch?: WebSearchAttribution;
  workflow?: CivicWorkflow;
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

function WorkflowChecklist({
  chatId,
  messageId,
  workflow,
  onContinue,
}: {
  chatId: string;
  messageId: string;
  workflow: CivicWorkflow;
  onContinue: (prompt: string) => void;
}) {
  const [currentWorkflow, setCurrentWorkflow] = useState(workflow);
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);
  const [error, setError] = useState("");
  const completedCount = currentWorkflow.steps.filter((step) => step.completed).length;
  const activeStepIndex = currentWorkflow.steps.findIndex((step) => !step.completed);

  useEffect(() => setCurrentWorkflow(workflow), [workflow]);

  const updateStep = async (stepId: string, completed: boolean) => {
    setUpdatingStep(stepId);
    setError("");
    try {
      const response = await fetch(`/api/chats/${chatId}/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, stepId, completed }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not save workflow progress.");
      }
      setCurrentWorkflow(result.workflow);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not save workflow progress.");
    } finally {
      setUpdatingStep(null);
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-primary/20 bg-background/70 p-4" aria-label="Civic action workflow">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <ListChecks className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{currentWorkflow.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{currentWorkflow.summary}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{completedCount} of {currentWorkflow.steps.length} steps complete</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Workflow progress"
          aria-valuemin={0}
          aria-valuemax={currentWorkflow.steps.length}
          aria-valuenow={completedCount}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(completedCount / currentWorkflow.steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="mt-4 space-y-3">
        {currentWorkflow.steps.map((step, index) => {
          const isActive = index === activeStepIndex;
          const isSaving = updatingStep === step.id;
          return (
            <li key={step.id} className="rounded-lg border border-border/70 p-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  disabled={isSaving || (!step.completed && !isActive) || updatingStep !== null}
                  onClick={() => updateStep(step.id, !step.completed)}
                  aria-label={`${step.completed ? "Mark incomplete" : "Mark complete"}: ${step.title}`}
                  aria-pressed={step.completed}
                  className="mt-0.5 rounded-full text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : step.completed
                      ? <CheckCircle2 className="h-5 w-5" />
                      : <Circle className="h-5 w-5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${step.completed ? "text-muted-foreground line-through" : ""}`}>
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {step.details}
                  </p>
                  {step.sourceUrl && (
                    <a
                      href={step.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-primary underline underline-offset-2"
                    >
                      Open official source
                    </a>
                  )}
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => onContinue(`Help me complete this workflow step: ${step.title}. ${step.details}`)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Continue with this step <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {activeStepIndex === -1 && (
        <p className="mt-4 rounded-lg bg-primary/10 p-3 text-sm font-medium text-primary">
          Workflow complete. You can continue chatting if you need help with anything else.
        </p>
      )}
    </section>
  );
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
    onWebSearch: (attribution, messageId) => {
      setMessages((prev) => prev.map((item) =>
        item.id === messageId ? { ...item, webSearch: attribution } : item
      ));
    },
    onWorkflow: (workflow, messageId) => {
      setMessages((prev) => prev.map((item) =>
        item.id === messageId ? { ...item, workflow } : item
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

  useEffect(() => {
    if (messages.length === 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0;
    }
  }, [messages.length]);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    autoScrollEnabled.current = true;
    setShowScrollButton(false);
  };

  useEffect(() => {
    if (autoScrollEnabled.current && messages.length > 0) {
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
    <div className="absolute inset-0 grid min-h-0 grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-6 text-center">
      <div className="w-full max-w-3xl self-end space-y-3 pb-3">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-2xl font-bold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Start a conversation
            </h3>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Ask about Tamil Nadu civic services to get a guided checklist you can complete step by step.
          </p>
        </div>
      </div>
      <div className="w-full max-w-3xl rounded-xl border border-border bg-background p-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDownWrapper}
            placeholder="Ask about any public service..."
            className="flex-1 h-10 border-0 bg-transparent shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 text-sm placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <FileUpload
            onFilesChange={(newFiles) => {
              setAttachedFiles((prev) => [...prev, ...newFiles]);
            }}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={isLoading || (!message.trim() && attachedFiles.length === 0)}
            aria-label="Send message"
            className="h-10 w-10 shrink-0 rounded-lg"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border/50 px-2 pt-2">
            {attachedFiles.map((file) => (
              <Badge key={file.id} variant="secondary" className="group flex items-center gap-2 px-2 py-1 text-xs">
                <span>{file.mimeType.startsWith("image/") ? "🖼️" : file.mimeType === "application/pdf" ? "📄" : "📎"}</span>
                <span className="max-w-[100px] truncate font-medium">{file.originalName}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFiles((prev) => prev.filter((item) => item.id !== file.id))}
                  className="rounded p-0.5 hover:bg-destructive/20 hover:text-destructive"
                  disabled={isLoading}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="w-full max-w-3xl max-h-full self-start space-y-3 overflow-y-auto pt-4">
        <p className="text-xs font-medium text-muted-foreground">Try these examples</p>
        <div className="grid grid-cols-1 gap-2 text-left sm:grid-cols-2 lg:grid-cols-3">
          {sampleQueries.map((item, index) => (
            <button
              key={index}
              onClick={() => handleSampleQueryClick(item.text)}
              className={cn(
                "group flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left transition-all duration-200 hover:border-primary/30 hover:bg-accent hover:shadow-md active:scale-[0.98]"
              )}
            >
              <Badge variant="secondary" className="shrink-0 text-[10px] px-2 py-0.5 font-medium">
                {item.category}
              </Badge>
              <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">{item.text}</p>
            </button>
          ))}
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
            {msg.workflow && (
              <WorkflowChecklist
                chatId={chatId}
                messageId={msg.id}
                workflow={msg.workflow}
                onContinue={(prompt) => {
                  setMessage(prompt);
                  inputRef.current?.focus();
                }}
              />
            )}
            {msg.tnInfo && (
              <div className="mt-3 border-t border-border/60 pt-3 text-xs">
                <p className="font-medium">Source: TN-Info (independent, best-effort data)</p>
                <p className="mt-1 text-muted-foreground">
                  {msg.tnInfo.status === "success"
                    ? msg.tnInfo.note
                    : msg.tnInfo.status === "unavailable"
                      ? "Live TN-Info data was unavailable for this answer."
                      : msg.tnInfo.note}
                </p>
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
            {msg.webSearch && (
              <div className="mt-3 border-t border-border/60 pt-3 text-xs">
                <p className="font-medium">Official government web search</p>
                <p className="mt-1 text-muted-foreground">
                  {msg.webSearch.status === "success"
                    ? "Answer references retrieved Government of India or NIC pages."
                    : msg.webSearch.status === "unavailable"
                      ? "Government web search is currently unavailable; results could not be verified."
                      : "No matching official government pages were retrieved."}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Checked: {formatTNInfoTimestamp(msg.webSearch.retrievedAt)}
                </p>
                {msg.webSearch.sources.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {msg.webSearch.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
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
              messages.length === 0
                ? "flex-1 overflow-hidden relative"
                : "flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent relative transition-all duration-200"
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

          {messages.length > 0 && <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 flex items-center h-14 shrink-0">
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
          </div>}
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
