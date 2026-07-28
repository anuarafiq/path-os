import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployerProfileForm } from "./EmployerProfileForm";

export default async function EmployerProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("id, company_name, industry, size, website")
    .eq("profile_id", profile.id)
    .single();

  if (!employer) redirect("/employer/setup");

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold mb-1">Company profile</h1>
        <p className="text-sm text-muted-foreground">Update your company details.</p>
      </div>
      <EmployerProfileForm employer={employer} />
    </div>
  );
}
