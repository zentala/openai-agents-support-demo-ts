/** Generate the static SVG/JSON vocabulary and DESIGN map from the app's real typed registry. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "app/package.json"));
const { tsImport } = require("tsx/esm/api");
const { ICONS } = await tsImport(pathToFileURL(path.join(root, "app/lib/ui/icons.ts")).href, import.meta.url);
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const START = "<!-- icons:generated:start -->", END = "<!-- icons:generated:end -->";

export function artifacts() {
  const icons = {}, symbols = [], rows = [];
  const used = new Set();
  for (const [key, glyph] of Object.entries(ICONS)) {
    if (used.has(glyph)) throw new Error(`Duplicate icon component: ${key}`);
    used.add(glyph);
    const name = glyph.displayName;
    if (!name) throw new Error(`Missing Lucide display name: ${key}`);
    const symbol = `icon-${key}`;
    const rendered = renderToStaticMarkup(createElement(glyph));
    const geometry = /^<svg\b[^>]*>([\s\S]*)<\/svg>$/.exec(rendered)?.[1];
    if (!geometry) throw new Error(`No SVG geometry: ${key}`);
    icons[key] = { glyph: name, symbol, ...(key === "github" ? {
      source: "https://github.com/primer/octicons/blob/main/icons/mark-github-24.svg", license: "GitHub brand usage; trademark rights reserved",
    } : {}) };
    symbols.push(`  <symbol id="${symbol}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${geometry}</symbol>`);
    rows.push(`| \`${key}\` | ${name} |`);
  }
  return {
    sprite: `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join("\n")}\n</svg>\n`,
    json: JSON.stringify({ version: 1, source: "lucide-react and the official GitHub mark", license: "Lucide: ISC; GitHub: brand usage", viewBox: "0 0 24 24", icons }, null, 2) + "\n",
    map: [START, "", "| Semantic key | Glyph (Lucide except GitHubMark) |", "| --- | --- |", ...rows, "", END].join("\n"),
  };
}

function update(write) {
  const { sprite, json, map } = artifacts();
  const design = readFileSync(path.join(root, "DESIGN.md"), "utf8");
  const start = design.indexOf(START), end = design.indexOf(END);
  if (start < 0 || end < start || start !== design.lastIndexOf(START) || end !== design.lastIndexOf(END)) throw new Error("DESIGN requires one ordered icons generated block");
  const outputs = [["app/public/icons.svg", sprite], ["app/public/icons.json", json],
    ["site/assets/icons.svg", sprite], ["site/assets/icons.json", json],
    ["DESIGN.md", design.slice(0, start) + map + design.slice(end + END.length)]];
  for (const [file, content] of outputs) {
    const absolute = path.join(root, file);
    if (write) { mkdirSync(path.dirname(absolute), { recursive: true }); writeFileSync(absolute, content); }
    else if (readFileSync(absolute, "utf8") !== content) throw new Error(`${file} is stale; run just icons`);
  }
  console.log(`PASS icon exports: ${Object.keys(ICONS).length} unique keys; SVG, JSON and DESIGN map ${write ? "written" : "current"}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) update(process.argv.includes("--write"));
