import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/ai/job-fit/route";

const mockUser = { id: "user-1" };
const VALID_JOB_ID = "11111111-1111-4111-8111-111111111111";

function makeSupabaseMock({
  user = mockUser,
  job = null as object | null,
  profile = null as object | null,
  candidate = null as object | null,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data:
          table === "jobs"
            ? job
            : table === "profiles"
            ? profile
            : table === "candidate_profiles"
            ? candidate
            : null,
      }),
    })),
  };
}

function makeRequest(jobId: unknown) {
  return new Request("http://localhost/api/ai/job-fit", {
    method: "POST",
    body: JSON.stringify({ jobId }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/ai/job-fit", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ user: null as never }) as never);

    const res = await POST(makeRequest(VALID_JOB_ID));
    expect(res.status).toBe(401);
  });

  it("returns 400 when jobId is not a UUID", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);

    const res = await POST(makeRequest("not-a-uuid"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when job not found", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock({ job: null }) as never);

    const res = await POST(makeRequest(VALID_JOB_ID));
    expect(res.status).toBe(404);
  });

  it("returns 404 when profile not found", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({
        job: { title: "Frontend Dev", required_skills: ["React"] },
        profile: null,
      }) as never
    );

    const res = await POST(makeRequest(VALID_JOB_ID));
    expect(res.status).toBe(404);
  });

  it("returns 404 when candidate profile not found", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({
        job: { title: "Frontend Dev", required_skills: ["React"] },
        profile: { id: "p-1" },
        candidate: null,
      }) as never
    );

    const res = await POST(makeRequest(VALID_JOB_ID));
    expect(res.status).toBe(404);
  });

  it("scores a full skill match at 100", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({
        job: { title: "Frontend Dev", required_skills: ["React"] },
        profile: { id: "p-1" },
        candidate: { years_exp: 2, candidate_skills: [{ skills: { name: "React" } }] },
      }) as never
    );

    const res = await POST(makeRequest(VALID_JOB_ID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.score).toBe(100);
    expect(typeof json.summary).toBe("string");
  });

  it("scores a partial skill match proportionally", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({
        job: { title: "Data Scientist", required_skills: ["Python", "ML"] },
        profile: { id: "p-1" },
        candidate: { years_exp: 1, candidate_skills: [{ skills: { name: "Python" } }] },
      }) as never
    );

    const res = await POST(makeRequest(VALID_JOB_ID));
    const json = await res.json();
    expect(json.score).toBe(50);
    expect(json.score).toBeGreaterThanOrEqual(0);
    expect(json.score).toBeLessThanOrEqual(100);
  });

  it("returns a neutral score when the job lists no required skills", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({
        job: { title: "Generalist", required_skills: [] },
        profile: { id: "p-1" },
        candidate: { years_exp: 3, candidate_skills: [] },
      }) as never
    );

    const res = await POST(makeRequest(VALID_JOB_ID));
    const json = await res.json();
    expect(json.score).toBe(50);
  });

  it("matches skills case-insensitively", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({
        job: { title: "Backend Dev", required_skills: ["node.js"] },
        profile: { id: "p-1" },
        candidate: { years_exp: 4, candidate_skills: [{ skills: { name: "Node.js" } }] },
      }) as never
    );

    const res = await POST(makeRequest(VALID_JOB_ID));
    const json = await res.json();
    expect(json.score).toBe(100);
  });
});
