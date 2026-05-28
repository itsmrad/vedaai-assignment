"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  ClipboardList,
  Sparkles,
  History,
  Settings,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/groups", label: "My Groups", icon: Users },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/toolkit", label: "AI Teacher's Toolkit", icon: Sparkles },
  { href: "/library", label: "My Library", icon: History },
];

const STORAGE_KEY = "vedaai-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Restore state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col rounded-2xl bg-card shadow-lg ring-1 ring-border/50 lg:flex",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px] p-3" : "w-72 p-5",
      )}
    >
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          "flex items-center pb-6",
          collapsed ? "justify-center" : "justify-between px-2",
        )}
      >
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo 2.png"
            alt="VedaAI"
            width={32}
            height={32}
            priority
            style={{ width: "auto", height: "auto" }}
          />
          {!collapsed && (
            <span className="text-xl font-semibold tracking-tight">VedaAI</span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            collapsed && "mt-3",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      {/* Create Assignment CTA */}
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/assignments/new"
                className="flex items-center justify-center rounded-xl border border-brand/40 bg-brand p-2.5 text-brand-foreground shadow-sm transition-colors hover:bg-brand/90"
              />
            }
          >
            <Plus className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Create Assignment</TooltipContent>
        </Tooltip>
      ) : (
        <Button
          size="lg"
          nativeButton={false}
          className="h-11 w-full gap-2 rounded-xl border border-brand/40 bg-brand text-brand-foreground shadow-sm hover:bg-brand/90 [a]:hover:bg-brand/90"
          render={<Link href="/assignments/new" />}
        >
          <Plus data-icon="inline-start" className="text-brand-foreground" />
          Create Assignment
        </Button>
      )}

      {/* Navigation */}
      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed
                  ? "justify-center p-2.5"
                  : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={link} />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto flex flex-col gap-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center justify-center rounded-lg p-2.5 text-sm font-medium transition-colors",
                    pathname.startsWith("/settings")
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                />
              }
            >
              <Settings className="size-[18px]" />
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-sidebar-accent text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Settings className="size-[18px]" />
            Settings
          </Link>
        )}

        <div
          className={cn(
            "flex items-center rounded-xl border border-sidebar-border bg-sidebar-accent/40",
            collapsed ? "justify-center p-2" : "gap-3 p-2.5",
          )}
        >
          <Avatar className="size-9 shrink-0">
            <AvatarImage src="/Avatar.png" alt="Delhi Public School" />
            <AvatarFallback>DP</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">
                Delhi Public School
              </span>
              <span className="truncate text-xs text-muted-foreground">
                Bokaro Steel City
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
