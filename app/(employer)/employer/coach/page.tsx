import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployerCoach } from "@/components/EmployerCoach";

export default async function EmployerCoachPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) redirect("/login");

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("company_name")
    .eq("profile_id", profile.id)
    .single();

  if (!employer) redirect("/employer/setup");

  return <EmployerCoach companyName={employer.company_name} />;
}
