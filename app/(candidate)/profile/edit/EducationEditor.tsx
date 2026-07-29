"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database";

type Qualification = Database["public"]["Tables"]["qualifications"]["Row"];

export function EducationEditor({ candidateId, initialItems }: { candidateId: string; initialItems: Qualification[] }) {
  const [items, setItems] = useState(initialItems);
  const [formOpen, setFormOpen] = useState(false);
  const [institution, setInstitution] = useState("");
  const [title, setTitle] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [grade, setGrade] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  function resetForm() {
    setFormOpen(false);
    setInstitution("");
    setTitle("");
    setFieldOfStudy("");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
    setGrade("");
    setError(null);
  }

  async function handleSave() {
    if (!institution.trim() || !title.trim()) return;
    setSaving(true);
    setError(null);

    const { data: newRow, error: saveErr } = await supabase
      .from("qualifications")
      .insert({
        candidate_id: candidateId,
        type: "education",
        institution: institution.trim(),
        title: title.trim(),
        field_of_study: fieldOfStudy.trim() || null,
        start_date: startDate ? `${startDate}-01` : null,
        end_date: isCurrent ? null : (endDate ? `${endDate}-01` : null),
        is_current: isCurrent,
        grade: grade.trim() || null,
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
    await supabase.from("qualifications").delete().eq("id", id);
    setItems((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="flex flex-col mb-4">
          {items.map((q) => (
            <div key={q.id} className="flex items-start justify-between py-3 border-b border-border">
              <div>
                <p className="font-medium text-sm text-foreground">{q.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {q.institution}
                  {q.field_of_study ? ` · ${q.field_of_study}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <p className="text-xs text-muted-foreground tabular">
                  {q.start_date ? new Date(q.start_date).getFullYear() : ""}
                  {q.is_current ? "–Present" : q.end_date ? `–${new Date(q.end_date).getFullYear()}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(q.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!formOpen && (
        <button type="button" onClick={() => setFormOpen(true)} className="text-sm text-brand hover:opacity-80 transition-opacity">
          + Add education
        </button>
      )}

      {formOpen && (
        <div className="border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <Label>Institution *</Label>
              <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Universiti Malaya" />
            </div>
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <Label>Degree / Programme *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bachelor of Computer Science" />
            </div>
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <Label>Field of study</Label>
              <Input value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} placeholder="Software Engineering" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Start date</Label>
              <Input type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>End date</Label>
              <Input type="month" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isCurrent} />
            </div>
            <label className="flex items-center gap-2 col-span-1 sm:col-span-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} className="accent-brand" />
              Currently studying here
            </label>
            <div className="flex flex-col gap-1.5">
              <Label>Grade / CGPA</Label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="3.75" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="button" onClick={handleSave} disabled={saving || !institution.trim() || !title.trim()}>
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
