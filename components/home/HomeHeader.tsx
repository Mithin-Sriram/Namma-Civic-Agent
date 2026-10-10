"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/global/ThemeToggle";
import Link from "next/link";
import config from "@/config";

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-sm font-semibold">{config.appName}</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/chats">
            <Button variant="default" size="sm">
              Go to Chats
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
