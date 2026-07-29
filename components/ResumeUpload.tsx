"use client";

import { useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXT = ["pdf", "doc", "docx"];

export function ResumeUpload({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      setError("Upload a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File must be under 5MB.");
      return;
    }

    setError(null);
    setUploading(true);
    const supabase = createClient();
    const path = `${userId}/resume.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("resumes")
      .upload(path, file, { upsert: true });
    setUploading(false);

    if (uploadErr) {
      setError("Upload failed. Try again.");
      return;
    }
    onChange(path);
  }

  async function handleView() {
    if (!value) return;
    const supabase = createClient();
    const { data } = await supabase.storage.from("resumes").createSignedUrl(value, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function handleRemove() {
    if (!value) return;
    const supabase = createClient();
    await supabase.storage.from("resumes").remove([value]);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Resume</Label>
      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-input px-3 py-2">
          <FileText className="size-4 text-muted-foreground shrink-0" />
          <button
            type="button"
            onClick={handleView}
            className="text-sm text-brand hover:opacity-80 transition-opacity truncate flex-1 text-left"
          >
            View resume
          </button>
          <label className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            {uploading ? "Uploading..." : "Replace"}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFile}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={handleRemove}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            "flex items-center gap-2 rounded-md border border-dashed border-input px-3 py-3 text-sm text-muted-foreground cursor-pointer hover:border-border/80 hover:bg-secondary transition-colors",
            uploading && "opacity-60 pointer-events-none"
          )}
        >
          <Upload className="size-4 shrink-0" />
          {uploading ? "Uploading..." : "Upload your resume (PDF, DOC, DOCX, max 5MB)"}
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
