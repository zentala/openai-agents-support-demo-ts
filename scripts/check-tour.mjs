/**
 * Checks CodeTour teaching anchors with plain Node, without models or dependencies.
 * A step must point inside its file and its line must contain the literal pattern.
 * This catches drift during just check before the walkthrough misleads its reader.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const tour = JSON.parse(readFileSync(path.join(root, ".tours/01-how-the-agent-works.tour"), "utf8"));
let failures = 0;
for (const [index, step] of tour.steps.entries()) {
  try {
    const lines = readFileSync(path.join(root, step.file), "utf8").split(/\r?\n/);
    // The trailing newline terminates the last line; it does not create another source line.
    if (lines.at(-1) === "") lines.pop();
    if (!Number.isInteger(step.line) || step.line < 1 || step.line > lines.length) {
      throw new Error(`line ${step.line} is outside 1-${lines.length}`);
    }
    if (typeof step.pattern !== "string" || !step.pattern.trim() || !lines[step.line - 1].includes(step.pattern)) {
      throw new Error(`line ${step.line} does not contain pattern ${JSON.stringify(step.pattern)}`);
    }
  } catch (error) {
    failures++;
    console.error(`FAIL step ${index + 1} (${step.file}): ${error.message}`);
  }
}
if (failures) process.exitCode = 1;
else console.log(`PASS CodeTour: ${tour.steps.length} source anchors checked`);
