/** Private guidance may shape a useful question; quoting the note or attributing it remains forbidden. */
import { detectLeak } from "./leak-detect";
import { stripInvisible } from "./normalize-input";
const normalized = (text: string) => stripInvisible(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function staffGuidanceLeak(answer: string, note: string): boolean {
  const privateText = normalized(note);
  if (privateText.split(" ").length < 7) return false;
  const output = normalized(answer);
  // SECURITY: substantial verbatim notes cannot be disclosed; short shared task vocabulary is not a secret.
  if (output.includes(privateText)) return true;
  const overlaps = detectLeak({ answer, promptTexts: [note], canary: "__staff_guidance_marker__", foreignSecrets: [] }).length > 0;
  // A normal question can share task vocabulary; revealing its private source is different.
  return overlaps && /\b(?:note|instruction|guidance|consultant told|internal|private|notatka|notatki|anweisung)\b/i.test(output);
}
