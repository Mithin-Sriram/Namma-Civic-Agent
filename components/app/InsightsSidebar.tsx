"use client";

import { useState, useEffect } from "react";
import { Sparkles, Building2, FileText, MapPin, CheckCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InsightsSidebarProps {
  query: string;
  className?: string;
  onClose?: () => void;
}

interface ExtractedData {
  entities: Array<string | { type?: string; name?: string }>;
  intent: string;
  key_points: string[];
  suggested_actions: string[];
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
          {insights.entities.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Entities
              </h4>
              <div className="flex flex-wrap gap-2">
                {insights.entities.map((entity, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {typeof entity === "string"
                      ? entity
                      : [entity.name, entity.type].filter(Boolean).join(" · ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {insights.key_points.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Key Points
              </h4>
              <ul className="space-y-2">
                {insights.key_points.map((point, idx) => (
                  <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                    <CheckCircle className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.suggested_actions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Suggested Actions
              </h4>
              <ul className="space-y-2">
                {insights.suggested_actions.map((action, idx) => (
                  <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                    <FileText className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-xs font-medium mb-2 text-muted-foreground">Intent</h4>
            <Badge variant="default" className="text-xs capitalize">
              {insights.intent.replace(/_/g, " ")}
            </Badge>
          </div>
        </>
      ) : null}
      </div>
    </div>
  );
}
