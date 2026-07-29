"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
                className="text-xs text-brand bg-transparent border-none outline-none cursor-pointer"
              >
                <option value="beginner">Beginner</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
              </select>
              <button type="button" onClick={() => handleDelete(s.id)} className="text-brand/60 hover:text-brand ml-0.5 text-xs">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <Input
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Python, React, Product Management..."
          />
        </div>
        <select
          value={skillLevel}
          onChange={(e) => setSkillLevel(e.target.value as Level)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
        >
          <option value="beginner">Beginner</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
        </select>
        <Button type="button" onClick={handleAdd} disabled={saving || !skillName.trim()}>
          {saving ? "Adding..." : "Add"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
