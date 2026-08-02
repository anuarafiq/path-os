"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Level = "beginner" | "mid" | "senior";

export type SkillRow = {
  id: string;
  level: Level;
  verified: boolean;
  skill_id: string;
  skills: { name: string; category: string } | null;
};

export function SkillsEditor({ candidateId, initialSkills }: { candidateId: string; initialSkills: SkillRow[] }) {
  const [skills, setSkills] = useState(initialSkills);
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState<Level>("mid");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleAdd() {
    if (!skillName.trim()) return;
    setSaving(true);
    setError(null);

    const { data: skill, error: skillErr } = await supabase
      .from("skills")
      .upsert({ name: skillName.trim(), category: "General" }, { onConflict: "name" })
      .select("id")
      .single();

    if (skillErr || !skill) {
      setError("Couldn't add that skill.");
      setSaving(false);
      return;
    }

    const { data: row, error: csErr } = await supabase
      .from("candidate_skills")
      .upsert(
        { candidate_id: candidateId, skill_id: skill.id, level: skillLevel, verified: false },
        { onConflict: "candidate_id,skill_id" }
      )
      .select("id, level, verified, skill_id, skills(name, category)")
      .single();

    setSaving(false);
    if (csErr || !row) {
      setError("Couldn't add that skill.");
      return;
    }

    setSkills((prev) => [...prev.filter((s) => s.skill_id !== skill.id), row as unknown as SkillRow]);
    setSkillName("");
    setSkillLevel("mid");
  }

  async function handleLevelChange(rowId: string, level: Level) {
    const prev = skills;
    setSkills((p) => p.map((s) => (s.id === rowId ? { ...s, level } : s)));
    const { error: updateErr } = await supabase.from("candidate_skills").update({ level }).eq("id", rowId);
    if (updateErr) setSkills(prev);
  }

  async function handleDelete(id: string) {
    await supabase.from("candidate_skills").delete().eq("id", id);
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {skills.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 bg-brand-subtle border border-brand/30 rounded-full pl-3 pr-1 py-1">
              <span className="text-xs font-medium text-brand">{s.skills?.name}</span>
              <select
                value={s.level}
                onChange={(e) => handleLevelChange(s.id, e.target.value as Level)}
                aria-label={`Skill level for ${s.skills?.name}`}
                className="text-xs text-brand bg-transparent border-none rounded-sm cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="beginner">Beginner</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
              </select>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                aria-label={`Remove ${s.skills?.name}`}
                className="flex items-center justify-center w-6 h-6 -mr-1 text-brand/60 hover:text-brand hover:bg-brand/10 text-xs rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <Label htmlFor="new-skill-name" className="sr-only">Skill name</Label>
          <Input
            id="new-skill-name"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Python, React, Product Management..."
          />
        </div>
        <Label htmlFor="new-skill-level" className="sr-only">Skill level</Label>
        <Select value={skillLevel} onValueChange={(v) => setSkillLevel(v as Level)}>
          <SelectTrigger id="new-skill-level">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="mid">Mid</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" onClick={handleAdd} disabled={saving || !skillName.trim()}>
          {saving ? "Adding..." : "Add"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
