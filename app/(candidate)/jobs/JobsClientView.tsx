"use client";

import { useMemo, useState } from "react";
import ApplyButton from "./ApplyButton";
import FitScore from "./FitScore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Job = {
  id: string;
  title: string;
  location: string | null;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  required_skills: string[] | null;
  description: string | null;
  employer_profiles: { company_name: string } | null;
};

interface Props {
  jobs: Job[];
  appliedJobIds: Set<string>;
  candidateProfileId: string | null;
  allSkills: string[];
}

const TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  contract: "Contract",
};

export default function JobsClientView({
  jobs,
  appliedJobIds,
  candidateProfileId,
  allSkills,
}: Props) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [empType, setEmpType] = useState("all");
  const [salaryMin, setSalaryMin] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  const hasFilters =
    keyword.trim() !== "" ||
    location.trim() !== "" ||
    empType !== "all" ||
    salaryMin !== "" ||
    selectedSkills.size > 0;

  function clearFilters() {
    setKeyword("");
    setLocation("");
    setEmpType("all");
    setSalaryMin("");
    setSelectedSkills(new Set());
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    const minSalary = salaryMin !== "" ? Number(salaryMin) * 1000 : null;

    return jobs.filter((job) => {
      if (kw && !job.title.toLowerCase().includes(kw) && !(job.description ?? "").toLowerCase().includes(kw)) return false;
      if (loc && !(job.location ?? "").toLowerCase().includes(loc)) return false;
      if (empType !== "all" && job.employment_type !== empType) return false;
      if (minSalary !== null && job.salary_max !== null && job.salary_max < minSalary) return false;
      if (selectedSkills.size > 0) {
        const jobSkills = (job.required_skills ?? []).map((s) => s.toLowerCase());
        for (const s of selectedSkills) {
          if (!jobSkills.includes(s.toLowerCase())) return false;
        }
      }
      return true;
    });
  }, [jobs, keyword, location, empType, salaryMin, selectedSkills]);

  const jobOrder = useMemo(() => new Map(jobs.map((j, i) => [j.id, i])), [jobs]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="rounded-lg border border-border glass p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:flex-wrap">
          <Input
            placeholder="Search jobs..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full sm:w-48 h-8 text-sm"
          />
          <Input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full sm:w-36 h-8 text-sm"
          />
          <Select value={empType} onValueChange={(v) => setEmpType(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-auto">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">RM</span>
            <Input
              type="number"
              placeholder="Min salary (k)"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              className="w-full sm:w-36 h-8 text-sm pl-8"
              min={0}
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground">
              Clear
            </Button>
          )}
        </div>

        {allSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allSkills.map((skill) => {
              const active = selectedSkills.has(skill);
              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-all active:scale-[0.98] ${
                    active
                      ? "bg-brand/15 border-brand/50 text-brand"
                      : "bg-secondary border-border text-muted-foreground hover:border-brand/40"
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-muted-foreground tabular-nums">
        Showing {filtered.length} of {jobs.length} job{jobs.length !== 1 ? "s" : ""}
      </p>

      {/* Job cards */}
      {filtered.length === 0 ? (
        <div className="glass border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground text-sm">No jobs match your filters.</p>
          <button onClick={clearFilters} className="text-xs text-brand mt-2 hover:underline transition-transform active:scale-[0.98]">Clear filters</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((job) => (
            <div
              key={job.id}
              className="glass border border-border rounded-lg p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 animate-rise"
              style={{ "--i": Math.min(jobOrder.get(job.id) ?? 0, 8) } as React.CSSProperties}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{job.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {job.employer_profiles?.company_name ?? "Company"} · {job.location} · <span className="capitalize">{job.employment_type.replace("_", "-")}</span>
                  </p>
                </div>
                {(job.salary_min || job.salary_max) && (
                  <span className="text-brand tabular text-xs font-semibold shrink-0 ml-4">
                    {job.salary_min && job.salary_max
                      ? `RM ${(job.salary_min / 1000).toFixed(0)}k–${(job.salary_max / 1000).toFixed(0)}k`
                      : job.salary_min
                      ? `From RM ${(job.salary_min / 1000).toFixed(0)}k`
                      : `Up to RM ${(job.salary_max! / 1000).toFixed(0)}k`}
                  </span>
                )}
              </div>
              {job.required_skills && job.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {job.required_skills.slice(0, 5).map((skill: string) => (
                    <span key={skill} className="text-xs bg-secondary border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                      {skill}
                    </span>
                  ))}
                  {job.required_skills.length > 5 && (
                    <span className="text-xs text-muted-foreground">+{job.required_skills.length - 5} more</span>
                  )}
                </div>
              )}
              {candidateProfileId && (
                <FitScore jobId={job.id} candidateId={candidateProfileId} />
              )}
              {candidateProfileId && (
                <ApplyButton
                  jobId={job.id}
                  candidateId={candidateProfileId}
                  initialApplied={appliedJobIds.has(job.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
