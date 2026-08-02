"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

export function ProfileDropdown({
  name,
  email,
  profileHref,
  settingsHref,
  extraItems = [],
  compact = false,
}: {
  name: string;
  email: string;
  profileHref: string;
  settingsHref: string;
  extraItems?: { href: string; label: string; icon: LucideIcon }[];
  /** Avatar-only trigger for tight spaces (e.g. mobile top bar). Opens downward instead of up. */
  compact?: boolean;
}) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          compact
            ? "flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
            : "flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-secondary"
        }
      >
        <Avatar size="sm">
          <AvatarFallback className="bg-brand-subtle text-brand text-xs font-bold">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {!compact && (
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={compact ? "bottom" : "top"}
        align={compact ? "end" : "start"}
        className="w-56"
      >
        <DropdownMenuItem render={<Link href={profileHref} />}>
          <User className="w-4 h-4" />
          Profile
        </DropdownMenuItem>
        {extraItems.map((item) => (
          <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
            <item.icon className="w-4 h-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem render={<Link href={settingsHref} />}>
          <Settings className="w-4 h-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
