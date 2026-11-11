/**
 * Runs a command with OPENAI_API_KEY available. Works the same on macOS, Linux and Windows.
 *
 *   node scripts/with-key.mjs corepack pnpm --dir app dev
 *
 * Key sources, first match wins:
 *   1. OPENAI_API_KEY already in the environment (the normal path for everyone).
 *   2. An OPTIONAL password broker configured explicitly: if its script exists, the key is
 *      injected into the child process only and never written to a file.
 *   3. Nothing found: the command still runs, and the Next.js app reads `app/.env.local`.
 *
 * SECURITY: this script only checks whether the variable is set; it never prints or stores a key.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const command = process.argv.slice(2);
if (command.length === 0) {
  console.error("usage: node scripts/with-key.mjs <command...>");
  process.exit(2);
}

// Optional integration: no personal installation paths or implicit discovery.
const brokerScript = process.env.PASSWORD_BROKER_SCRIPT;

/** Starts a child process wired to our terminal and exits with its exit code. */
function runAndExit(file, args, useShell) {
  const child = spawn(file, args, { stdio: "inherit", shell: useShell });
  child.on("exit", (code) => process.exit(code ?? 1));
  child.on("error", (error) => {
    console.error(`could not start ${file}: ${error.message}`);
    process.exit(1);
  });
}

if (process.env.OPENAI_API_KEY) {
  // shell:true so `corepack` resolves to corepack.cmd on Windows; one string avoids Node's args-with-shell warning.
  runAndExit(command.join(" "), [], true);
} else if (brokerScript && existsSync(brokerScript)) {
  console.error("OPENAI_API_KEY not set: asking the password broker for it.");
  // The broker runs the part after `::` with the key in its environment; we re-enter this script there.
  runAndExit(
    "pwsh",
    ["-NoProfile", "-File", brokerScript, "inject", "openai-api-key", "-EnvName", "OPENAI_API_KEY", "::", "node", import.meta.filename, ...command],
    false,
  );
} else {
  console.error("OPENAI_API_KEY is not set. Export it, or put it in app/.env.local (see app/.env.example).");
  runAndExit(command.join(" "), [], true);
}
