"use client";

import { useState } from "react";

export default function ShareButton({ candidateId }: { candidateId: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/p/${candidateId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-brand/40 transition-colors"
    >
      {copied ? "Copied!" : "Share ↗"}
    </button>
  );
}
