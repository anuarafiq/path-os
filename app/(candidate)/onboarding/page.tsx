"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ResumeUpload } from "@/components/ResumeUpload";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Skill = Database["public"]["Tables"]["skills"]["Row"];
type SeekingType = "internship" | "full_time";

const STEPS = [
  "Who you are",
  "What you're seeking",
  "Qualifications",
  "Work experience",
  "Your skills",
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showImport, setShowImport] = useState(true);
  const [cvText, setCvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1 — basic info
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  // Step 2 — seeking
  const [seeking, setSeeking] = useState<SeekingType>("full_time");
  const [currentRole, setCurrentRole] = useState("");
  const [yearsExp, setYearsExp] = useState("");

  // Step 3 — qualifications
  type QualEntry = {
    type: "education" | "certificate";
    institution: string;
    title: string;
    field_of_study: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    grade: string;
  };
  const [quals, setQuals] = useState<QualEntry[]>([
    { type: "education", institution: "", title: "", field_of_study: "", start_date: "", end_date: "", is_current: false, grade: "" },
  ]);

  // Step 4 — work experience
  type WorkEntry = {
    company: string;
    title: string;
    location: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    employment_type: "full_time" | "part_time" | "internship" | "contract";
    description: string;
  };
  const [noExperience, setNoExperience] = useState(false);
  const [workExps, setWorkExps] = useState<WorkEntry[]>([
    { company: "", title: "", location: "", start_date: "", end_date: "", is_current: false, employment_type: "full_time", description: "" },
  ]);

  // Step 5 — skills
  const [selectedSkills, setSelectedSkills] = useState<{ id: string; level: "beginner" | "mid" | "senior" }[]>([]);
  const [skillSearch, setSkillSearch] = useState("");

  useEffect(() => {
    supabase.from("skills").select("*").order("category").then(({ data }) => {
      if (data) setAllSkills(data);
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const filteredSkills = allSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(skillSearch.toLowerCase())
  );

  function toggleSkill(skillId: string) {
    setSelectedSkills((prev) => {
      const exists = prev.find((s) => s.id === skillId);
      if (exists) return prev.filter((s) => s.id !== skillId);
      return [...prev, { id: skillId, level: "mid" }];
    });
  }

  function setSkillLevel(skillId: string, level: "beginner" | "mid" | "senior") {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, level } : s))
    );
  }

  async function handleImport() {
    if (!cvText.trim()) return;
    setImporting(true);
    setImportError(null);
    const res = await fetch("/api/resumes/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cvText }),
    });
    if (!res.ok) {
      setImportError("Parsing failed. You can still fill the form manually.");
      setImporting(false);
      return;
    }
    const parsed = await res.json();
    if (parsed.name) setName(parsed.name);
    if (parsed.location) setLocation(parsed.location);
    if (parsed.bio) setBio(parsed.bio);
    if (parsed.github_url) setGithubUrl(parsed.github_url);
    if (parsed.linkedin_url) setLinkedinUrl(parsed.linkedin_url);
    if (parsed.seeking === "internship" || parsed.seeking === "full_time") setSeeking(parsed.seeking);
    if (parsed.job_title) setCurrentRole(parsed.job_title);
    if (parsed.years_exp) setYearsExp(String(parsed.years_exp));
    if (parsed.qualifications?.length > 0) setQuals(parsed.qualifications);
    if (parsed.work_experiences?.length > 0) {
      setWorkExps(parsed.work_experiences);
      setNoExperience(false);
    }
    if (parsed.skills?.length > 0) {
      const matched = (parsed.skills as string[])
        .map((skillName: string) => allSkills.find((s) => s.name.toLowerCase() === skillName.toLowerCase()))
        .filter((s): s is Skill => s !== undefined)
        .map((s) => ({ id: s.id, level: "mid" as const }));
      if (matched.length > 0) setSelectedSkills(matched);
    }
    setImporting(false);
    setShowImport(false);
  }

  async function handleFinish() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get or create profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({ user_id: user.id, role: "candidate" })
        .select("id")
        .single();
      profile = newProfile;
    }

    if (!profile) {
      setSaving(false);
      return;
    }

    // Create candidate profile
    const { data: candidateProfile } = await supabase
      .from("candidate_profiles")
      .insert({
        profile_id: profile.id,
        name,
        location: location || null,
        bio: bio || null,
        github_url: githubUrl || null,
        linkedin_url: linkedinUrl || null,
        seeking,
        job_title: currentRole || null,
        years_exp: yearsExp ? parseInt(yearsExp) : null,
        resume_url: resumeUrl,
      })
      .select("id")
      .single();

    if (!candidateProfile) {
      setSaving(false);
      return;
    }

    const cid = candidateProfile.id;

    // Qualifications
    const validQuals = quals.filter((q) => q.institution && q.title);
    if (validQuals.length > 0) {
      await supabase.from("qualifications").insert(
        validQuals.map((q) => ({
          candidate_id: cid,
          type: q.type,
          institution: q.institution,
          title: q.title,
          field_of_study: q.field_of_study || null,
          start_date: q.start_date || null,
          end_date: q.is_current ? null : (q.end_date || null),
          is_current: q.is_current,
          grade: q.grade || null,
          document_url: null,
        }))
      );
    }

    // Work experience
    if (!noExperience) {
      const validWork = workExps.filter((w) => w.company && w.title && w.start_date);
      if (validWork.length > 0) {
        await supabase.from("work_experiences").insert(
          validWork.map((w) => ({
            candidate_id: cid,
            company: w.company,
            title: w.title,
            location: w.location || null,
            start_date: w.start_date,
            end_date: w.is_current ? null : (w.end_date || null),
            is_current: w.is_current,
            description: w.description || null,
            employment_type: w.employment_type,
            document_url: null,
          }))
        );
      }
    }

    // Skills
    if (selectedSkills.length > 0) {
      await supabase.from("candidate_skills").insert(
        selectedSkills.map((s) => ({
          candidate_id: cid,
          skill_id: s.id,
          level: s.level,
          verified: false,
        }))
      );
    }

    window.location.href = "/dashboard";
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  if (showImport) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-start py-12 px-4">
        <div className="w-full max-w-xl">
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-semibold mb-1">Set up your profile</h1>
            <p className="text-sm text-muted-foreground">
              Paste your CV below and we&apos;ll auto-fill your profile, or skip to fill it manually.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste your CV or resume text here..."
              rows={12}
            />
            {importError && <p className="text-xs text-[var(--danger)]">{importError}</p>}
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowImport(false)}>
                Skip, fill manually
              </Button>
              <Button onClick={handleImport} disabled={!cvText.trim() || importing}>
                {importing ? "Importing..." : "Auto-fill from CV"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-xs text-brand font-medium tabular">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-secondary rounded-full">
            <div
              className="h-1 bg-brand rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <h1 className="font-heading text-2xl font-semibold mt-4">{STEPS[step]}</h1>
        </div>

        {/* Step 0: Basic info */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmad Faris" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Kuala Lumpur, Malaysia" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A sentence or two about you..." rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="github">GitHub URL</Label>
                <Input id="github" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="github.com/username" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input id="linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/..." />
              </div>
            </div>
            {userId && (
              <ResumeUpload userId={userId} value={resumeUrl} onChange={setResumeUrl} />
            )}
          </div>
        )}

        {/* Step 1: Seeking */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-3">I&apos;m looking for</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "internship", label: "Internship", desc: "I'm a student or recent grad seeking an internship" },
                  { value: "full_time", label: "Full-time role", desc: "I'm looking for a permanent or contract position" },
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
                  <Label htmlFor="currentRole">Current / most recent role</Label>
                  <Input id="currentRole" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="Software Engineer" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="yearsExp">Years of experience</Label>
                  <Input id="yearsExp" type="number" min="0" max="50" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} placeholder="3" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Qualifications */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            {quals.map((q, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {(["education", "certificate"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setQuals((prev) => prev.map((x, idx) => idx === i ? { ...x, type: t } : x))}
                        className={cn(
                          "text-xs px-3 py-1 rounded-md font-medium transition-colors",
                          q.type === t ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t === "education" ? "Education" : "Certificate"}
                      </button>
                    ))}
                  </div>
                  {quals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuals((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                    <Label>Institution *</Label>
                    <Input value={q.institution} onChange={(e) => setQuals((p) => p.map((x, idx) => idx === i ? { ...x, institution: e.target.value } : x))} placeholder={q.type === "education" ? "Universiti Malaya" : "Coursera"} />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                    <Label>{q.type === "education" ? "Degree / Programme *" : "Certificate name *"}</Label>
                    <Input value={q.title} onChange={(e) => setQuals((p) => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} placeholder={q.type === "education" ? "Bachelor of Computer Science" : "AWS Solutions Architect"} />
                  </div>
                  {q.type === "education" && (
                    <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                      <Label>Field of study</Label>
                      <Input value={q.field_of_study} onChange={(e) => setQuals((p) => p.map((x, idx) => idx === i ? { ...x, field_of_study: e.target.value } : x))} placeholder="Software Engineering" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label>Start date</Label>
                    <Input type="month" value={q.start_date} onChange={(e) => setQuals((p) => p.map((x, idx) => idx === i ? { ...x, start_date: e.target.value } : x))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>End date</Label>
                    <Input type="month" value={q.end_date} onChange={(e) => setQuals((p) => p.map((x, idx) => idx === i ? { ...x, end_date: e.target.value } : x))} disabled={q.is_current} />
                  </div>
                  <label className="flex items-center gap-2 col-span-1 sm:col-span-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={q.is_current}
                      onChange={(e) => setQuals((p) => p.map((x, idx) => idx === i ? { ...x, is_current: e.target.checked } : x))}
                      className="accent-brand"
                    />
                    Currently studying here
                  </label>
                  {q.type === "education" && (
                    <div className="flex flex-col gap-1.5">
                      <Label>Grade / CGPA</Label>
                      <Input value={q.grade} onChange={(e) => setQuals((p) => p.map((x, idx) => idx === i ? { ...x, grade: e.target.value } : x))} placeholder="3.75" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setQuals((p) => [...p, { type: "education", institution: "", title: "", field_of_study: "", start_date: "", end_date: "", is_current: false, grade: "" }])}
              className="text-sm text-brand hover:opacity-80 transition-opacity"
            >
              + Add another qualification
            </button>
          </div>
        )}

        {/* Step 3: Work experience */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <label className="flex items-center gap-3 text-sm cursor-pointer bg-secondary rounded-lg px-4 py-3">
              <input
                type="checkbox"
                checked={noExperience}
                onChange={(e) => setNoExperience(e.target.checked)}
                className="accent-brand"
              />
              <span>I have no work experience yet</span>
            </label>

            {!noExperience && (
              <>
                {workExps.map((w, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Position {i + 1}</span>
                      {workExps.length > 1 && (
                        <button type="button" onClick={() => setWorkExps((p) => p.filter((_, idx) => idx !== i))} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label>Company *</Label>
                        <Input value={w.company} onChange={(e) => setWorkExps((p) => p.map((x, idx) => idx === i ? { ...x, company: e.target.value } : x))} placeholder="Grab" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Job title *</Label>
                        <Input value={w.title} onChange={(e) => setWorkExps((p) => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} placeholder="Software Engineer" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Location</Label>
                        <Input value={w.location} onChange={(e) => setWorkExps((p) => p.map((x, idx) => idx === i ? { ...x, location: e.target.value } : x))} placeholder="Kuala Lumpur" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Employment type</Label>
                        <select
                          value={w.employment_type}
                          onChange={(e) => setWorkExps((p) => p.map((x, idx) => idx === i ? { ...x, employment_type: e.target.value as WorkEntry["employment_type"] } : x))}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                        >
                          <option value="full_time">Full-time</option>
                          <option value="part_time">Part-time</option>
                          <option value="internship">Internship</option>
                          <option value="contract">Contract</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Start date *</Label>
                        <Input type="month" value={w.start_date} onChange={(e) => setWorkExps((p) => p.map((x, idx) => idx === i ? { ...x, start_date: e.target.value } : x))} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>End date</Label>
                        <Input type="month" value={w.end_date} onChange={(e) => setWorkExps((p) => p.map((x, idx) => idx === i ? { ...x, end_date: e.target.value } : x))} disabled={w.is_current} />
                      </div>
                      <label className="flex items-center gap-2 col-span-1 sm:col-span-2 text-sm text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={w.is_current} onChange={(e) => setWorkExps((p) => p.map((x, idx) => idx === i ? { ...x, is_current: e.target.checked } : x))} className="accent-brand" />
                        I currently work here
                      </label>
                      <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                        <Label>What did you do?</Label>
                        <Textarea value={w.description} onChange={(e) => setWorkExps((p) => p.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} placeholder="Describe your responsibilities and achievements..." rows={2} />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setWorkExps((p) => [...p, { company: "", title: "", location: "", start_date: "", end_date: "", is_current: false, employment_type: "full_time", description: "" }])}
                  className="text-sm text-brand hover:opacity-80 transition-opacity"
                >
                  + Add another position
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 4: Skills */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <Input
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              placeholder="Search skills (e.g. Python, React, Product Management)..."
            />

            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map((s) => {
                  const skill = allSkills.find((sk) => sk.id === s.id);
                  if (!skill) return null;
                  return (
                    <div key={s.id} className="flex items-center gap-1.5 bg-brand-subtle border border-brand/30 rounded-full pl-3 pr-1 py-1">
                      <span className="text-xs font-medium text-brand">{skill.name}</span>
                      <select
                        value={s.level}
                        onChange={(e) => setSkillLevel(s.id, e.target.value as "beginner" | "mid" | "senior")}
                        className="text-xs text-brand bg-transparent border-none outline-none cursor-pointer"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="mid">Mid</option>
                        <option value="senior">Senior</option>
                      </select>
                      <button type="button" onClick={() => toggleSkill(s.id)} className="text-brand/60 hover:text-brand ml-0.5 text-xs">×</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="max-h-72 overflow-y-auto flex flex-col gap-1">
              {Object.entries(
                filteredSkills.reduce<Record<string, Skill[]>>((acc, skill) => {
                  if (!acc[skill.category]) acc[skill.category] = [];
                  acc[skill.category].push(skill);
                  return acc;
                }, {})
              ).map(([category, skills]) => (
                <div key={category} className="mb-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1 mb-1">{category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => {
                      const isSelected = selectedSkills.some((s) => s.id === skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(skill.id)}
                          className={cn(
                            "text-xs px-3 py-1.5 rounded-full border transition-all",
                            isSelected
                              ? "bg-brand text-primary-foreground border-brand"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-border/60"
                          )}
                        >
                          {skill.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">{selectedSkills.length} skill{selectedSkills.length !== 1 ? "s" : ""} selected</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !name.trim()}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving}>
              {saving ? "Setting up..." : "Finish setup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
