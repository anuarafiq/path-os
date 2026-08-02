import { redirect } from "next/navigation";
import { getSessionProfile, getEmployerProfile } from "@/lib/supabase/server";
import { EmployerSidebar } from "@/components/EmployerSidebar";

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
    <div className="flex min-h-screen bg-background">
      <EmployerSidebar
        companyName={employer?.company_name ?? user.email ?? ""}
        email={user.email ?? ""}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="h-12 md:hidden" aria-hidden="true" />
        {children}
      </main>
    </div>
  );
}
