import { redirect } from "next/navigation";
import { getSessionProfile, getEmployerProfile } from "@/lib/supabase/server";
import { EmployerShell } from "@/components/EmployerShell";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");

  if (!profile || profile.role !== "employer") redirect("/dashboard");

  const employer = await getEmployerProfile(profile.id);

  return (
    <EmployerShell
      companyName={employer?.company_name ?? user.email ?? ""}
      email={user.email ?? ""}
      employerProfile={employer}
    >
      {children}
    </EmployerShell>
  );
}
