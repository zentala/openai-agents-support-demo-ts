/** Scan tracked UTF-8 text for private bindings, owner identity and credential shapes; never echo secret matches. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const owner = "zen" + "tala";
const name = "Pa" + "we[\u0142l]";
const privateText = new RegExp(["\\." + "inter" + "nal\\b", "p" + "m3", "C:/" + "Users", owner,
  "her" + "dr", "m" + "ATX", "password" + "-broker", "home" + "lab", name,
  "https?:\\/\\/(?:localhost|127\\.0\\.0\\.1):" + 2080 + "\\/proxy\\.pac"].join("|"), "i");
const ownerIdentity = new RegExp(`${owner}|${name}`, "gi");
const publicationUrl = new RegExp(`(?:https?:\\/\\/)?github\\.com\\/${owner}\\/openai-agents-support-demo-ts\\b`, "g");
const keyShape = /\bsk-(?:(?:proj|svcacct|admin)-)?[A-Za-z0-9_-]{20,}\b/;
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
let checked = 0;
let findings = 0;
let lockfiles = 0;
for (const file of paths) {
  // Upstream dependency digests can contain coincidental private-name substrings. Never edit them.
  if (/(^|\/)(pnpm-lock\.yaml|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|bun\.lockb?)$/i.test(file)) {
    lockfiles++;
    continue;
  }
  const bytes = readFileSync(file);
  if (bytes.includes(0)) continue;
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { continue; }
  checked++;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    let safe = line.replace(publicationUrl, "[publication repository]");
    if (file === "LICENSE") safe = safe.replace(ownerIdentity, "[author]");
    const category = keyShape.test(line) ? "key-shaped text [redacted]" : privateText.test(safe) ? "private identity or topology" : undefined;
    if (category) { console.error(`FAIL ${file}:${index + 1}: ${category}`); findings++; }
  }
}
console.log(`${findings ? "FAIL" : "PASS"} publication scan: ${checked} tracked text files, ${lockfiles} lockfile(s) excluded, ${findings} findings`);
if (findings) process.exitCode = 1;
