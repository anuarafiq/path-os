import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// Mock the AI Gateway client
vi.mock("@/lib/claude/client", () => ({
  MODEL: "mock-model",
}));

import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { POST } from "@/app/api/resumes/parse/route";

const mockUser = { id: "user-1" };

function makeSupabaseMock(user: typeof mockUser | null = mockUser) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/resumes/parse", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock(null) as never);

    const req = new Request("http://localhost/api/resumes/parse", {
      method: "POST",
      body: JSON.stringify({ cvText: "some cv" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when cvText is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);

    const req = new Request("http://localhost/api/resumes/parse", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when cvText is empty string", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);

    const req = new Request("http://localhost/api/resumes/parse", {
      method: "POST",
      body: JSON.stringify({ cvText: "   " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns parsed JSON from the model response", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify({
        name: "Ahmad Chicken",
        location: "Kuala Lumpur",
        bio: "CS student",
        github_url: "",
        linkedin_url: "",
        seeking: "internship",
        job_title: "Software Engineering Intern",
        years_exp: 1,
        qualifications: [],
        work_experiences: [],
        skills: ["Python", "React"],
      }),
    } as never);

    const req = new Request("http://localhost/api/resumes/parse", {
      method: "POST",
      body: JSON.stringify({ cvText: "Ahmad Chicken, CS student at UTM..." }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("Ahmad Chicken");
    expect(json.skills).toContain("Python");
  });

  it("extracts JSON from a model response wrapped in markdown fences", async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const payload = { name: "Test User", skills: ["Go"], seeking: "full_time" };
    vi.mocked(generateText).mockResolvedValue({
      text: `Here is the result:\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``,
    } as never);

    const req = new Request("http://localhost/api/resumes/parse", {
      method: "POST",
      body: JSON.stringify({ cvText: "Go developer with 5 years experience" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("Test User");
  });
});
