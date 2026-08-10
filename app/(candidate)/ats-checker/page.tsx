import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { AtsCheckerForm } from "./AtsCheckerForm";

export default async function AtsCheckerPage() {
  const { profile } = await getSessionProfile();
  const supabase = await createClient();

  const [{ data: candidate }, { data: jobs }] = await Promise.all([
    profile
      ? supabase.from("candidate_profiles").select("resume_url").eq("profile_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("jobs")
      .select("id, title, employer_profiles(company_name)")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
  ]);

  const resumeUrl = candidate?.resume_url ?? null;
  const hasPdfResume = !!resumeUrl && resumeUrl.split(".").pop()?.toLowerCase() === "pdf";

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl">
      <h1 className="font-heading text-3xl font-bold mb-1">ATS Checker</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Compare your resume against a job description for keyword gaps and formatting issues.
      </p>
      <AtsCheckerForm
        hasPdfResume={hasPdfResume}
        jobs={(jobs ?? []).map((j) => ({
          id: j.id,
          title: j.title,
          company: (j.employer_profiles as unknown as { company_name: string } | null)?.company_name ?? "",
        }))}
      />
    </div>
  );
}
