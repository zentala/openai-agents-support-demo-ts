/** Validate real gallery artifacts against the shared scenario metadata and H13 vocabulary without network or a key. */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import catalog from "@/data/scenarios.json";
import { ICONS } from "@/lib/ui/icons";

const root = path.resolve(import.meta.dirname, "../..");
const recorded = JSON.parse(readFileSync(path.join(root, "site/data/scenarios.json"), "utf8"));
const selected = catalog.filter(s => "gallery" in s);

it("records exactly the curated catalog, with unchanged editorial metadata", () => {
  expect(recorded.map((s: { id: string }) => s.id).sort()).toEqual(selected.map(s => s.id).sort());
  for (const scenario of selected) {
    const source = (scenario as { gallery: { title: string; category: string; lead: string; why: string; badges: string[]; shows: string[]; steps: unknown[] } }).gallery;
    const result = recorded.find((s: { id: string }) => s.id === scenario.id);
    for (const key of ["title", "category", "lead", "why", "badges", "shows"] as const) expect(result[key]).toEqual(source[key]);
    expect(source.shows.length).toBeGreaterThan(0);
    expect(result.source).toBe(JSON.stringify(source));
    expect(result.steps).toHaveLength(source.steps.length);
  }
});

it("ships every frame, valid measured bounds, captions and registered semantic icons", () => {
  for (const scenario of recorded) {
    expect(scenario.icon in ICONS).toBe(true);
    expect(scenario.badges.every((b: string) => ["rule", "AI"].includes(b))).toBe(true);
    for (const step of scenario.steps) {
      expect(step.icon in ICONS).toBe(true);
      expect(step.caption.length).toBeGreaterThan(10);
      expect(step.holdMs).toBeGreaterThan(0);
      expect(step.width).toBe(1440); expect(step.height).toBe(900);
      expect(step.focusSelector).toMatch(/^\[data-testid=/);
      const { x, y, width, height } = step.focus;
      expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
      expect(width).toBeGreaterThan(0); expect(height).toBeGreaterThan(0);
      expect(x + width).toBeLessThanOrEqual(1440); expect(y + height).toBeLessThanOrEqual(900);
      expect(step.frame).toMatch(/^frames\/[a-z0-9-]+\.webp$/);
      const frame = path.join(root, "site", step.frame);
      expect(existsSync(frame)).toBe(true);
      const bytes = readFileSync(frame);
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
    }
  }
});
