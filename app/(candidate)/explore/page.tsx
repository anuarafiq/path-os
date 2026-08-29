import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CareerPathExplorer } from "@/components/CareerPathExplorer";

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) redirect("/login");

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id, job_title, seeking")
    .eq("profile_id", profile.id)
    .single();

  if (!candidate) redirect("/onboarding");

  const [{ data: nodes }, { data: edges }, { data: skills }, { data: openJobs }] = await Promise.all([
    supabase.from("career_nodes").select("*"),
    supabase.from("career_edges").select("*"),
    supabase
      .from("candidate_skills")
      .select("level, skills(name)")
      .eq("candidate_id", candidate.id),
    supabase
      .from("jobs")
      .select("id, title, location, salary_min, salary_max, employer_profiles(company_name)")
      .eq("status", "open"),
  ]);

  const candidateSkillNames: string[] = (
    (skills ?? []) as unknown as { skills: { name: string } | null }[]
  )
    .map((s) => s.skills?.name ?? "")
    .filter(Boolean);

  return (
    <CareerPathExplorer
      nodes={nodes ?? []}
      edges={edges ?? []}
      currentRole={candidate.job_title}
      seeking={candidate.seeking}
      candidateSkillNames={candidateSkillNames}
      openJobs={
        (openJobs ?? []) as unknown as {
          id: string;
          title: string;
          location: string;
          salary_min: number | null;
          salary_max: number | null;
          employer_profiles: { company_name: string } | null;
        }[]
      }
    />
  );
}
