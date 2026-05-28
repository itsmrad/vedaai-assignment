"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, ChevronDown, Grid2x2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title?: string;
  showBack?: boolean;
  className?: string;
}

export function Topbar({ title = "Assignment", showBack = true, className }: TopbarProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-card/80 px-4 backdrop-blur-sm lg:px-6",
        className,
      )}
    >
      {/* Mobile logo (hidden on lg) */}
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <Image
          src="/logo 2.png"
          alt="VedaAI"
          width={28}
          height={28}
          priority
          style={{ width: "auto", height: "auto" }}
        />
        <span className="text-base font-semibold">VedaAI</span>
      </Link>

      {showBack && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          onClick={() => router.back()}
          className="hidden lg:inline-flex"
        >
          <ArrowLeft />
        </Button>
      )}

      <div className="hidden items-center gap-2 text-muted-foreground lg:flex">
        <Grid2x2 className="size-4" />
        <span className="text-sm">{title}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label="Notifications"
        >
          <Bell />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-notify" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-1 py-1 transition-colors hover:bg-muted/60 aria-expanded:bg-muted"
              />
            }
          >
            <Avatar className="size-7">
              <AvatarImage src="/Avatar.png" alt="John Doe" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">John Doe</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
