"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Grid2x2,
  ClipboardList,
  Sparkles,
  History,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Grid2x2 },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/library", label: "Library", icon: History },
  { href: "/toolkit", label: "AI Toolkit", icon: Sparkles },
];

export function MobileTabbar() {
  const pathname = usePathname();
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center border-t border-border bg-card px-2 lg:hidden">
        {TABS.map((t) => {
          const isActive =
            t.href === "/"
              ? pathname === "/"
              : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/assignments/new"
        aria-label="Create assignment"
        className="fixed bottom-20 right-4 z-30 flex size-12 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition-transform hover:scale-105 lg:hidden"
      >
        <Plus className="size-5" />
      </Link>
    </>
  );
}
