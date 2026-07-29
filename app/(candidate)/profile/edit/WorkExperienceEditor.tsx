"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";

type WorkExperience = Database["public"]["Tables"]["work_experiences"]["Row"];
type EmploymentType = WorkExperience["employment_type"];

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring text-foreground";

export function WorkExperienceEditor({ candidateId, initialItems }: { candidateId: string; initialItems: WorkExperience[] }) {
  const [items, setItems] = useState(initialItems);
  const [formOpen, setFormOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("full_time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  function resetForm() {
    setFormOpen(false);
    setCompany("");
    setTitle("");
    setLocation("");
    setEmploymentType("full_time");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
    setDescription("");
    setError(null);
  }

  async function handleSave() {
    if (!company.trim() || !title.trim() || !startDate) return;
    setSaving(true);
    setError(null);

    const { data: newRow, error: saveErr } = await supabase
      .from("work_experiences")
      .insert({
        candidate_id: candidateId,
        company: company.trim(),
        title: title.trim(),
        location: location.trim() || null,
        start_date: `${startDate}-01`,
        end_date: isCurrent ? null : (endDate ? `${endDate}-01` : null),
        is_current: isCurrent,
        description: description.trim() || null,
        employment_type: employmentType,
        document_url: null,
      })
      .select()
      .single();

    setSaving(false);
    if (saveErr || !newRow) {
      setError("Failed to save. Try again.");
      return;
    }
    setItems((prev) => [newRow, ...prev]);
    resetForm();
  }

  async function handleDelete(id: string) {
    await supabase.from("work_experiences").delete().eq("id", id);
    setItems((prev) => prev.filter((w) => w.id !== id));
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="flex flex-col mb-4">
          {items.map((w) => (
            <div key={w.id} className="py-3 border-b border-border">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-medium text-sm text-foreground">{w.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.company}
                    {w.location ? ` · ${w.location}` : ""}
                    {" · "}
                    <span className="capitalize">{w.employment_type.replace("_", "-")}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <p className="text-xs text-muted-foreground tabular">
                    {new Date(w.start_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" })}
                    {" – "}
                    {w.is_current ? "Present" : w.end_date ? new Date(w.end_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" }) : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDelete(w.id)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {w.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 max-w-prose">{w.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!formOpen && (
        <button type="button" onClick={() => setFormOpen(true)} className="text-sm text-brand hover:opacity-80 transition-opacity">
          + Add work experience
        </button>
      )}

      {formOpen && (
        <div className="border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Company *</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Grab" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Job title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Software Engineer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Kuala Lumpur" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Employment type</Label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className={SELECT_CLASS}
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Start date *</Label>
              <Input type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>End date</Label>
              <Input type="month" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isCurrent} />
            </div>
            <label className="flex items-center gap-2 col-span-1 sm:col-span-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} className="accent-brand" />
              I currently work here
            </label>
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <Label>What did you do?</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your responsibilities and achievements..." rows={2} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="button" onClick={handleSave} disabled={saving || !company.trim() || !title.trim() || !startDate}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
