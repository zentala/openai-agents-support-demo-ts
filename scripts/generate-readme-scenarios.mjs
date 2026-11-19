/**
 * Generates the README scenario catalog from the same fixtures used by the UI and eval runner.
 * One JSON catalog supplies every README scenario row. --check/default reports drift without writing;
 * --write explicitly replaces only the marked block. Uses Node built-ins, no model or dependencies.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const START = "<!-- scenarios:generated:start -->";
const END = "<!-- scenarios:generated:end -->";
const cell = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll("|", "\\|").replaceAll("`", "\\`").replace(/[\r\n]+/g, " ");

/** Emit metadata only: seeded values and staff-note text never enter public README output. */
export function renderScenarioBlock(scenarios) {
  const groups = new Map();
  for (const scenario of scenarios) {
    if (!groups.has(scenario.category)) groups.set(scenario.category, []);
    groups.get(scenario.category).push(scenario);
  }
  const lines = [START, "", `All ${scenarios.length} synthetic scenarios from [scenarios.json](app/data/scenarios.json), grouped by category.`, "",
    "Steps count customer messages. Widget clicks and consultant decisions are additional actions. UI + eval examples appear in the start screen and Scenarios menu; eval-only examples require fixture setup.", ""];
  for (const [category, entries] of [...groups].sort(([a], [b]) => a.localeCompare(b, "en"))) {
    lines.push("<details>", `<summary>${cell(category)} (${entries.length})</summary>`, "",
      "| Scenario | Stable ID | Steps | Availability |", "| --- | --- | --- | --- |");
    for (const scenario of entries) {
      // Match the existing menu catalog's setup predicate without importing browser/model code.
      const evalOnly = Boolean(scenario.seedRefunds || scenario.seedSecrets || scenario.staffNote);
      lines.push(`| ${cell(scenario.label)} | \`${cell(scenario.id)}\` | ${1 + (scenario.followUps?.length ?? 0)} | ${evalOnly ? "Eval only (fixture setup)" : "UI + eval"} |`);
    }
    lines.push("", "</details>", "");
  }
  return [...lines, END].join("\n");
}

/** Preserve the surrounding README, screenshots and line endings. Missing/duplicate markers fail visibly. */
export function replaceScenarioBlock(readme, generated) {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start < 0 || end < start || start !== readme.lastIndexOf(START) || end !== readme.lastIndexOf(END)) {
    throw new Error("README must contain exactly one ordered scenarios:generated start/end marker pair.");
  }
  const eol = readme.includes("\r\n") ? "\r\n" : "\n";
  return readme.slice(0, start) + generated.replaceAll("\n", eol) + readme.slice(end + END.length);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && !["--check", "--write"].includes(args[0]))) {
    throw new Error("Usage: node scripts/generate-readme-scenarios.mjs [--check|--write]");
  }
  // Resolve repository files from this script, independent of the caller's working directory.
  const scenarios = JSON.parse(readFileSync(new URL("../app/data/scenarios.json", import.meta.url), "utf8"));
  const target = new URL("../README.md", import.meta.url);
  const readme = readFileSync(target, "utf8");
  const updated = replaceScenarioBlock(readme, renderScenarioBlock(scenarios));
  if (updated === readme) {
    console.log(`PASS README scenario catalog: ${scenarios.length} scenarios`);
    return;
  }
  if (args[0] !== "--write") {
    console.error("FAIL README scenario catalog is stale. Run node scripts/generate-readme-scenarios.mjs --write and review the diff.");
    process.exitCode = 1;
    return;
  }
  writeFileSync(target, updated, "utf8");
  console.log(`Updated README scenario catalog: ${scenarios.length} scenarios`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) {
    console.error(`FAIL README scenario catalog: ${error.message}`);
    process.exitCode = 1;
  }
}
