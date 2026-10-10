"use client";

import { ThemeToggle } from "@/components/global/ThemeToggle";
import { Breadcrumbs } from "@/components/app/Breadcrumbs";
import Link from "next/link";
import Image from "next/image";
import config from "@/config";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between w-full px-6">
        <div className="flex items-center gap-4">
          <Link href="/chats" className="flex items-center cursor-pointer">
            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-background border border-border">
              <Image
                src="/logo.png"
                alt={config.appName}
                fill
                className="object-cover"
                priority
              />
            </div>
          </Link>
          <Breadcrumbs />
        </div>
        
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
