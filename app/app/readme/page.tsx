/** Render the repository's security documentation; no forge remote is configured for an external link. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";

export default async function ReadmePage() {
  // Read the owning README rather than maintaining a second copy of security limits.
  const readme = await readFile(path.join(process.cwd(), "..", "README.md"), "utf8");
  const security = readme.split("## Security")[1]?.split("## More documents")[0] ?? "Security documentation unavailable.";
  return <main className="mx-auto max-w-3xl p-6 text-sm"><Link href="/?tab=how" className="text-blue-700 underline">Back to demo</Link>
    <h1 id="security" className="my-4 text-2xl font-semibold">README · Security</h1>
    <pre className="whitespace-pre-wrap break-words font-sans leading-relaxed">{security.trim()}</pre>
  </main>;
}
