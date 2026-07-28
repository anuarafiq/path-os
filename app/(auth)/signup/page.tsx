"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "candidate" | "employer";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as Role) ?? "candidate";

  const [role, setRole] = useState<Role>(defaultRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create shared profile record
      await supabase.from("profiles").insert({ user_id: data.user.id, role });
    }

    window.location.href = role === "employer" ? "/employer/dashboard" : "/onboarding";
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center mb-8">
          <Logo size={64} className="rounded-md" />
        </Link>

        <h1 className="font-heading text-xl font-semibold mb-1">Create an account</h1>
        <p className="text-sm text-muted-foreground mb-6">Get started in under 2 minutes</p>

        {/* Role toggle */}
        <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-secondary rounded-lg">
          {(["candidate", "employer"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "py-2 px-3 rounded-md text-sm font-medium transition-all",
                role === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "candidate" ? "I'm a candidate" : "I'm hiring"}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By signing up you agree to our terms of service.
        </p>

        <p className="text-sm text-muted-foreground text-center mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:opacity-80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupForm />
    </Suspense>
  );
}
