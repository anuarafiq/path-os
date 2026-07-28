import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedCandidate, seedEmployer } from "@/lib/demo-seed";

const DEMO_CANDIDATE = {
  email: "demo.candidate@careeros.dev",
  password: "DemoCandidate2026",
};

const DEMO_EMPLOYER = {
  email: "demo.employer@careeros.dev",
  password: "DemoEmployer2026",
};

export async function POST(req: Request) {
  try {
    const { role } = (await req.json()) as { role: "candidate" | "employer" };
    if (role !== "candidate" && role !== "employer") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const admin = createAdminClient();
    const creds = role === "candidate" ? DEMO_CANDIDATE : DEMO_EMPLOYER;

    // Find or create auth user
    const { data: listData } = await admin.auth.admin.listUsers();
    let userId = listData?.users.find((u) => u.email === creds.email)?.id;

    if (!userId) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: creds.email,
        password: creds.password,
        email_confirm: true,
      });
      if (error || !created.user) {
        return NextResponse.json(
          { error: error?.message ?? "Failed to create demo user" },
          { status: 500 }
        );
      }
      userId = created.user.id;
    }

    // Seed data if profile doesn't exist yet
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingProfile) {
      if (role === "candidate") {
        await seedCandidate(admin, userId);
      } else {
        await seedEmployer(admin, userId);
      }
    }

    // Always try to link demo pool — runs on every login so it works regardless of seeding order
    await linkDemoPool(admin);

    return NextResponse.json({ email: creds.email, password: creds.password });
  } catch (e) {
    console.error("[demo] unexpected error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function linkDemoPool(admin: any) {
  const { data: listData } = await admin.auth.admin.listUsers();
  const users = listData?.users ?? [];
  const candidateUserId = users.find((u: { email: string }) => u.email === DEMO_CANDIDATE.email)?.id;
  const employerUserId = users.find((u: { email: string }) => u.email === DEMO_EMPLOYER.email)?.id;
  if (!candidateUserId || !employerUserId) return;

  const [{ data: candidateRow }, { data: employerRow }] = await Promise.all([
    admin.from("profiles").select("id").eq("user_id", candidateUserId).single(),
    admin.from("profiles").select("id").eq("user_id", employerUserId).single(),
  ]);
  if (!candidateRow || !employerRow) return;

  const [{ data: candidateProfile }, { data: employerProfile }] = await Promise.all([
    admin.from("candidate_profiles").select("id").eq("profile_id", candidateRow.id).single(),
    admin.from("employer_profiles").select("id").eq("profile_id", employerRow.id).single(),
  ]);
  if (!candidateProfile || !employerProfile) return;

  await admin.from("talent_pools").upsert(
    { employer_id: employerProfile.id, candidate_id: candidateProfile.id, source: "applied" },
    { onConflict: "employer_id,candidate_id" }
  );
}
