"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/employer/dashboard", label: "Dashboard",       icon: "⊟" },
  { href: "/employer/profile",   label: "Company Profile", icon: "◓" },
  { href: "/employer/jobs",      label: "Jobs",            icon: "◑" },
  { href: "/employer/search",    label: "Find Talent",     icon: "◒" },
  { href: "/employer/pipeline",  label: "Pipeline",        icon: "◓" },
  { href: "/employer/re-engage", label: "Re-Engage",       icon: "◐" },
];

export function EmployerSidebar({
  companyName,
  email,
}: {
  companyName: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navContent = (
    <>
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
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-brand-subtle flex items-center justify-center text-brand text-xs font-bold shrink-0">
            {companyName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{companyName}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border flex-col h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-border">
          <Logo size={80} className="rounded-md" />
          <p className="text-xs text-muted-foreground mt-1">Employer</p>
        </div>
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="flex md:hidden items-center justify-between px-4 h-12 border-b border-border bg-background fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center gap-2">
          <Logo size={32} className="rounded-sm" />
          <span className="text-xs text-muted-foreground">Employer</span>
        </div>
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
          "fixed top-0 left-0 z-50 h-full w-72 bg-background border-r border-border flex flex-col transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <Logo size={40} className="rounded-sm" />
            <p className="text-xs text-muted-foreground mt-1">Employer</p>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        {navContent}
      </div>
    </>
  );
}
