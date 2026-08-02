import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — cookies will be set by middleware
          }
        },
      },
    }
  );
}

// Deduped per-render: layouts and pages under the same route segment tree
// both need the session/profile, so cache() collapses those into one
// getUser() + one `profiles` query instead of one per component.
export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  return { user, profile };
});

export const getCandidateProfile = cache(async (profileId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidate_profiles")
    .select("id, name, seeking, job_title, years_exp, location")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data;
});

export const getEmployerProfile = cache(async (profileId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employer_profiles")
    .select("id, company_name")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data;
});
