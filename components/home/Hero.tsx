"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import config from "@/config";

interface HeroProps {
  hero: {
    title: string;
    subheading: string;
    searchPlaceholder: string;
    primaryCta: string;
    secondaryCta: string;
    exampleLabel: string;
    examples: string[];
  };
}

export function Hero({ hero }: HeroProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");

  const handleExampleClick = (example: string) => {
    setInputValue(example);
  };

  const startExploring = () => {
    const query = inputValue.trim();
    router.push(query ? `/chats?q=${encodeURIComponent(query)}` : "/chats");
  };

  return (
    <section className="h-screen md:h-auto md:flex-[0.8] flex flex-col items-center justify-center text-center px-4 py-6 md:py-12">
      <div className="w-full max-w-2xl space-y-6 md:space-y-10">
        <div className="flex items-center justify-center">
          <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
            <Image
              src="/logo.png"
              alt="Namma-Civic-Agent"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="space-y-3 md:space-y-5">
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              {hero.title}
            </h1>

            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-border px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-muted-foreground bg-muted/50">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shrink-0" />
              <span className="text-center">{config.appDescription}</span>
            </div>

            <p className="mx-auto max-w-xl text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed px-2 sm:px-0">
              {hero.subheading}
            </p>
          </div>
        </div>

        <div className="space-y-5 md:space-y-6">
          <div className="flex flex-col sm:flex-row gap-2 rounded-xl border border-border bg-background p-4 shadow-lg">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={hero.searchPlaceholder}
              className="h-10 flex-1 border-border bg-background text-base focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button size="lg" className="h-10 text-base" onClick={startExploring}>
              {hero.primaryCta}
            </Button>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-muted-foreground text-center">
              {hero.exampleLabel}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
              {hero.examples.map((example) => (
                <Button
                  key={example}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExampleClick(example)}
                  className={cn(
                    "rounded-full border-dashed",
                    "px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px]",
                    "hover:-translate-y-px hover:border-foreground"
                  )}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
