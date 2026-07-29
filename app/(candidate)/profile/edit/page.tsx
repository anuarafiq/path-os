import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditForm } from "./ProfileEditForm";
import { EducationEditor } from "./EducationEditor";
import { WorkExperienceEditor } from "./WorkExperienceEditor";
import { SkillsEditor, type SkillRow } from "./SkillsEditor";
import { PortfolioItemsEditor } from "./PortfolioItemsEditor";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id, name, location, bio, github_url, linkedin_url, seeking, job_title, years_exp, resume_url, is_public")
    .eq("profile_id", profile.id)
    .single();

  if (!candidate) redirect("/onboarding");

  const [
    { data: education },
    { data: workExps },
    { data: skillRows },
    { data: portfolioItems },
  ] = await Promise.all([
    supabase
      .from("qualifications")
      .select("*")
      .eq("candidate_id", candidate.id)
      .eq("type", "education")
      .order("start_date", { ascending: false }),
    supabase
      .from("work_experiences")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("start_date", { ascending: false }),
    supabase
      .from("candidate_skills")
      .select("id, level, verified, skill_id, skills(name, category)")
      .eq("candidate_id", candidate.id),
    supabase
      .from("portfolio_items")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold mb-1">Edit profile</h1>
        <p className="text-sm text-muted-foreground">Update your personal info and preferences.</p>
      </div>
      <ProfileEditForm candidate={candidate} userId={user.id} />

      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold mb-1">Education</h2>
        <p className="text-sm text-muted-foreground mb-4">Degrees and academic qualifications.</p>
        <EducationEditor candidateId={candidate.id} initialItems={education ?? []} />
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold mb-1">Work experience</h2>
        <p className="text-sm text-muted-foreground mb-4">Jobs and internships you&apos;ve held.</p>
        <WorkExperienceEditor candidateId={candidate.id} initialItems={workExps ?? []} />
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold mb-1">Skills</h2>
        <p className="text-sm text-muted-foreground mb-4">What you&apos;re good at, and how strong you are at it.</p>
        <SkillsEditor candidateId={candidate.id} initialSkills={(skillRows ?? []) as unknown as SkillRow[]} />
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-semibold mb-1">Projects</h2>
        <p className="text-sm text-muted-foreground mb-4">Things you&apos;ve built, worth showing off.</p>
        <PortfolioItemsEditor candidateId={candidate.id} initialItems={portfolioItems ?? []} />
      </section>
    </div>
  );
}
