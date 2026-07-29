"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";

type PortfolioItem = Database["public"]["Tables"]["portfolio_items"]["Row"];

export function PortfolioItemsEditor({ candidateId, initialItems }: { candidateId: string; initialItems: PortfolioItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [date, setDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  function addTag(raw: string) {
    const val = raw.trim().replace(/,$/, "");
    if (val && !tags.includes(val)) setTags((prev) => [...prev, val]);
    setTagInput("");
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function resetForm() {
    setFormOpen(false);
    setTitle("");
    setDescription("");
    setUrl("");
    setDate("");
    setTags([]);
    setTagInput("");
    setError(null);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const { data: newRow, error: saveErr } = await supabase
      .from("portfolio_items")
      .insert({
        candidate_id: candidateId,
        title: title.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        tags,
        date: date ? `${date}-01` : null,
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
    await supabase.from("portfolio_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="flex flex-col mb-4">
          {items.map((item) => (
            <div key={item.id} className="py-3 border-b border-border">
              <div className="flex items-start justify-between mb-1">
                <p className="font-medium text-sm text-foreground">{item.title}</p>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:opacity-80">
                      View ↗
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">{item.description}</p>
              )}
              {(item.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-secondary border border-border px-2 py-0.5 rounded text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!formOpen && (
        <button type="button" onClick={() => setFormOpen(true)} className="text-sm text-brand hover:opacity-80 transition-opacity">
          + Add project
        </button>
      )}

      {formOpen && (
        <div className="border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Career path recommender" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>URL</Label>
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/you/project" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you build and why?" rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Input type="month" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags-input">Tags</Label>
            <div className="flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 bg-brand-subtle text-brand rounded px-2 py-0.5 text-xs font-medium shrink-0">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="hover:opacity-70 transition-opacity leading-none"
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="tags-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                placeholder={tags.length === 0 ? "e.g. React, Python — press Enter to add" : ""}
                className="flex-1 min-w-24 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="button" onClick={handleSave} disabled={saving || !title.trim()}>
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
