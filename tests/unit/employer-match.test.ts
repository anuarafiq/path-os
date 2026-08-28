import { describe, it, expect } from "vitest";
import { parseMatchResults, parseSuggestions } from "@/lib/ai/employer-match";

describe("parseMatchResults / parseSuggestions", () => {
  const cases = [parseMatchResults, parseSuggestions];

  it("parses a clean JSON array", () => {
    for (const parse of cases) {
      expect(parse('[{"candidateId":"a","name":"Ada"}]')).toEqual([{ candidateId: "a", name: "Ada" }]);
    }
  });

  it("extracts an array from markdown-fenced / prose-wrapped output", () => {
    for (const parse of cases) {
      const text = 'Here you go:\n```json\n[{"candidateId":"b"}]\n```';
      expect(parse(text)).toEqual([{ candidateId: "b" }]);
    }
  });

  it("returns [] on unparseable garbage", () => {
    for (const parse of cases) {
      expect(parse("no json here")).toEqual([]);
      expect(parse("[not valid json")).toEqual([]);
    }
  });
});
