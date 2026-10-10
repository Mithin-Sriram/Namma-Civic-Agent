"use client";

import { useState, useEffect } from "react";
import { Sparkles, Building2, FileText, CheckCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InsightsSidebarProps {
  query: string;
  className?: string;
  onClose?: () => void;
}

type EntityItem = string | { type?: string; name?: string; [key: string]: unknown };

interface ExtractedData {
  entities?: EntityItem[];
  intent?: string | { name?: string; type?: string; [key: string]: unknown };
  key_points?: (string | Record<string, unknown>)[];
  suggested_actions?: (string | Record<string, unknown>)[];
}

function formatEntity(entity: unknown): string {
  if (typeof entity === "string") return entity;
  if (entity && typeof entity === "object") {
    const e = entity as Record<string, unknown>;
    const name = typeof e.name === "string" ? e.name : "";
    const type = typeof e.type === "string" ? e.type : "";
    if (name && type) return [name, type].filter(Boolean).join(" · ");
    if (name) return name;
    if (type) return type;
    const firstVal = Object.values(e).find((v) => typeof v === "string");
    if (typeof firstVal === "string") return firstVal;
  }
  return String(entity ?? "");
}

function formatTextItem(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const candidate = obj.point || obj.action || obj.text || obj.title || obj.description || obj.name;
    if (typeof candidate === "string") return candidate;
    const firstVal = Object.values(obj).find((v) => typeof v === "string");
    if (typeof firstVal === "string") return firstVal;
  }
  return String(item ?? "");
}

function formatIntent(intent: unknown): string {
  if (typeof intent === "string") return intent.replace(/_/g, " ");
  if (intent && typeof intent === "object") {
    const obj = intent as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name : typeof obj.type === "string" ? obj.type : "";
    if (name) return name.replace(/_/g, " ");
  }
  return String(intent || "general info").replace(/_/g, " ");
}

export function InsightsSidebar({ query, className, onClose }: InsightsSidebarProps) {
  const [insights, setInsights] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 10) {
      setInsights(null);
      return;
    }

    const fetchInsights = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/ai/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        if (response.ok) {
          const data = await response.json();
          setInsights(data);
        }
      } catch (error) {
        console.error("Failed to extract insights:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchInsights, 500);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  if (!insights && !isLoading) {
    return null;
  }

  const entities = Array.isArray(insights?.entities) ? insights.entities : [];
  const keyPoints = Array.isArray(insights?.key_points) ? insights.key_points : [];
  const suggestedActions = Array.isArray(insights?.suggested_actions) ? insights.suggested_actions : [];

  return (
    <div className={cn("border-l border-border bg-muted/30 flex flex-col h-full", className)}>
      <div className="flex items-center justify-between gap-2 p-4 pb-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Insights</h3>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 rounded-full hover:bg-muted"
            aria-label="Close insights"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Analyzing query...</div>
      ) : insights ? (
        <>
          {entities.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Entities
              </h4>
              <div className="flex flex-wrap gap-2">
                {entities.map((entity, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {formatEntity(entity)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {keyPoints.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Key Points
              </h4>
              <ul className="space-y-2">
                {keyPoints.map((point, idx) => (
                  <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <span>{formatTextItem(point)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestedActions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Suggested Actions
              </h4>
              <ul className="space-y-2">
                {suggestedActions.map((action, idx) => (
                  <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                    <FileText className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <span>{formatTextItem(action)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.intent ? (
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground">Intent</h4>
              <Badge variant="default" className="text-xs capitalize">
                {formatIntent(insights.intent)}
              </Badge>
            </div>
          ) : null}
        </>
      ) : null}
      </div>
    </div>
  );
}
