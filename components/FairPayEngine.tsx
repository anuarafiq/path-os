"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/types/database";

type SalaryData = Database["public"]["Tables"]["salary_data"]["Row"];

export function FairPayEngine({
  salaryData,
  defaultRole,
  defaultLocation,
}: {
  salaryData: SalaryData[];
  defaultRole: string;
  defaultLocation: string;
}) {
  const [role, setRole] = useState(defaultRole);
  const [location, setLocation] = useState(defaultLocation || "Kuala Lumpur");
  const [expBand, setExpBand] = useState("2-5 years");

  const roles = useMemo(() => Array.from(new Set(salaryData.map((s) => s.role))).sort(), [salaryData]);
  const locations = useMemo(() => Array.from(new Set(salaryData.map((s) => s.location))).sort(), [salaryData]);
  const expBands = ["Intern", "0-2 years", "2-5 years", "5-8 years", "8+ years"];

  const match = useMemo(() => {
    return salaryData.find(
      (s) =>
        s.role.toLowerCase() === role.toLowerCase() &&
        s.location.toLowerCase() === location.toLowerCase() &&
        s.experience_band === expBand
    );
  }, [salaryData, role, location, expBand]);

  const relatedRoles = useMemo(() => {
    if (!role) return [];
    return salaryData
      .filter(
        (s) =>
          s.location.toLowerCase() === location.toLowerCase() &&
          s.experience_band === expBand &&
          s.role.toLowerCase() !== role.toLowerCase()
      )
      .slice(0, 4);
  }, [salaryData, role, location, expBand]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <h1 className="font-heading text-3xl font-bold mb-1">Fair Pay Engine</h1>
      <p className="text-muted-foreground text-sm mb-8">Know your market value before your next negotiation.</p>

      {/* Inputs */}
      <div className="bg-card border border-border rounded-lg p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Location</Label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
            >
              {locations.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Experience</Label>
            <select
              value={expBand}
              onChange={(e) => setExpBand(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
            >
              {expBands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {match ? (
        <div className="flex flex-col gap-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "25th percentile", value: match.p25, desc: "Entry point" },
              { label: "Median", value: match.p50, desc: "Market rate" },
              { label: "75th percentile", value: match.p75, desc: "Top earners" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-lg px-4 py-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-brand tabular font-bold font-heading text-xl">
                  RM {(stat.value / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.desc}</p>
              </div>
            ))}
          </div>

          {/* Visual bar */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="relative h-6 bg-secondary rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-brand/30 rounded-full"
                style={{ width: "100%" }}
              />
              <div
                className="absolute top-0 h-full bg-brand rounded-full"
                style={{
                  left: `${((match.p25 / match.p75) * 60).toFixed(0)}%`,
                  width: `${(((match.p75 - match.p25) / match.p75) * 60).toFixed(0)}%`,
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground tabular">
              <span>RM {match.p25.toLocaleString()}</span>
              <span className="text-brand font-medium">RM {match.p50.toLocaleString()} median</span>
              <span>RM {match.p75.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Source: {match.source} · {match.year}
          </p>
        </div>
      ) : role ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center mb-6">
          <p className="text-muted-foreground text-sm">No data for this combination yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different location or experience band.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-6 text-center mb-6">
          <p className="text-muted-foreground text-sm">Select a role to see salary benchmarks.</p>
        </div>
      )}

      {/* Related roles */}
      {relatedRoles.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            Compare with similar roles
          </h2>
          <div className="flex flex-col gap-2">
            {relatedRoles.map((s) => (
              <button
                key={`${s.role}-${s.location}`}
                type="button"
                onClick={() => setRole(s.role)}
                className="flex items-center justify-between bg-card border border-border hover:border-brand/40 rounded-lg px-4 py-3 text-sm transition-all group"
              >
                <span className="text-foreground group-hover:text-brand transition-colors">{s.role}</span>
                <span className="text-brand tabular font-medium">
                  RM {(s.p25 / 1000).toFixed(0)}k–{(s.p75 / 1000).toFixed(0)}k
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
