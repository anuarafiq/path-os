"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResumeUpload } from "@/components/ResumeUpload";
import { cn } from "@/lib/utils";

type SeekingType = "internship" | "full_time";

type Candidate = {
  id: string;
  name: string;
  location: string | null;
  bio: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  seeking: string | null;
  job_title: string | null;
  years_exp: number | null;
  resume_url: string | null;
  is_public: boolean;
};

export function ProfileEditForm({ candidate, userId }: { candidate: Candidate; userId: string }) {
  const router = useRouter();

  const [name, setName] = useState(candidate.name ?? "");
  const [location, setLocation] = useState(candidate.location ?? "");
  const [bio, setBio] = useState(candidate.bio ?? "");
  const [githubUrl, setGithubUrl] = useState(candidate.github_url ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(candidate.linkedin_url ?? "");
  const [seeking, setSeeking] = useState<SeekingType>((candidate.seeking as SeekingType) ?? "full_time");
  const [jobTitle, setJobTitle] = useState(candidate.job_title ?? "");
  const [yearsExp, setYearsExp] = useState(candidate.years_exp?.toString() ?? "");
  const [resumeUrl, setResumeUrl] = useState(candidate.resume_url ?? null);
  const [isPublic, setIsPublic] = useState(candidate.is_public);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: updateErr } = await supabase
      .from("candidate_profiles")
      .update({
        name: name.trim(),
        location: location.trim() || null,
        bio: bio.trim() || null,
        github_url: githubUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        seeking,
        job_title: jobTitle.trim() || null,
        years_exp: yearsExp ? parseInt(yearsExp) : null,
        resume_url: resumeUrl,
        is_public: isPublic,
      })
      .eq("id", candidate.id);

    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Full name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ahmad Faris"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Kuala Lumpur, Malaysia"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A sentence or two about you..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="github">GitHub URL</Label>
          <Input
            id="github"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="github.com/username"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="linkedin">LinkedIn URL</Label>
          <Input
            id="linkedin"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="linkedin.com/in/..."
          />
        </div>
      </div>

      <ResumeUpload userId={userId} value={resumeUrl} onChange={setResumeUrl} />

      <div className="flex flex-col gap-2">
        <Label>I&apos;m looking for</Label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: "internship", label: "Internship", desc: "Student or recent grad" },
            { value: "full_time", label: "Full-time role", desc: "Permanent or contract" },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSeeking(option.value)}
              className={cn(
                "flex flex-col items-start text-left p-4 rounded-lg border transition-all",
                seeking === option.value
                  ? "border-brand bg-brand-subtle"
                  : "border-border hover:border-border/80 hover:bg-secondary"
              )}
            >
              <span className="font-medium text-sm mb-1">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {seeking === "full_time" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jobTitle">Current / most recent role</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Software Engineer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="yearsExp">Years of experience</Label>
            <Input
              id="yearsExp"
              type="number"
              min="0"
              max="50"
              value={yearsExp}
              onChange={(e) => setYearsExp(e.target.value)}
              placeholder="3"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="isPublic">Public portfolio</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            When on, your portfolio is visible at your public link and to employers browsing search.
          </p>
        </div>
        <input
          id="isPublic"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="accent-brand w-4 h-4 cursor-pointer shrink-0"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? "Saving..." : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
