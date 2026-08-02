"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Route,
  Bot,
  DollarSign,
  FolderKanban,
  CircleUser,
  Award,
  Briefcase,
  ClipboardList,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/explore",   label: "Explore Paths", icon: Route },
  { href: "/coach",     label: "AI Coach", icon: Bot },
  { href: "/pay",       label: "Fair Pay", icon: DollarSign },
  { href: "/portfolio",     label: "Portfolio",    icon: FolderKanban },
  { href: "/profile/edit", label: "Profile",      icon: CircleUser },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/jobs",          label: "Jobs",         icon: Briefcase },
  { href: "/applications",  label: "My Applications", icon: ClipboardList },
];

export function CandidateSidebar({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = (
    <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all",
              isActive
                ? "bg-brand-subtle text-brand font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border flex-col h-screen sticky top-0 bg-sidebar">
        <div className="px-5 py-5 border-b border-border">
          <Logo size={80} className="rounded-md" />
        </div>
        {navLinks}
        <div className="px-3 py-4 border-t border-border flex items-center justify-between gap-2">
          <ProfileDropdown
            name={name}
            email={email}
            profileHref="/profile/edit"
            settingsHref="/settings"
          />
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex md:hidden items-center justify-between px-4 h-12 border-b border-border bg-sidebar fixed top-0 left-0 right-0 z-30">
        <Logo size={32} className="rounded-sm" />
        <div className="flex items-center gap-2">
          <ProfileDropdown
            compact
            name={name}
            email={email}
            profileHref="/profile/edit"
            settingsHref="/settings"
          />
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setIsOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
              <rect y="0"  width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="6"  width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile slide-in drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 glass border-r border-border flex flex-col transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <Logo size={40} className="rounded-sm" />
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        {navLinks}
        <div className="px-3 py-4 border-t border-border flex items-center justify-end">
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}
