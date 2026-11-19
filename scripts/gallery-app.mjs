/** Start an isolated, short-lived production app for recording synthetic data without resetting another session. */
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";

export async function startGalleryApp() {
  const app = path.resolve(import.meta.dirname, "../app");
  const require = createRequire(path.join(app, "package.json"));
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  // SECURITY: the signing secret exists only in this child's environment; never persist or log it.
  // The broker-injected model key also reaches only this local child; logs are not recorded.
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: app, env: { ...process.env, SESSION_SECRET: randomBytes(32).toString("hex"), PUBLIC_DEMO: "false", ALLOW_DEMO_RESET: "true", ADMIN_PASSWORD: "", OPENAI_AGENTS_DISABLE_TRACING: "1" },
    windowsHide: true, stdio: "ignore",
  });
  const url = `http://127.0.0.1:${port}/`;
  const cleanup = () => child.kill();
  process.once("exit", cleanup);
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`GalleryAppExited: ${child.exitCode}`);
      if (await fetch(url).then(r => r.ok).catch(() => false)) return { url, close: () => { process.off("exit", cleanup); child.kill(); } };
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    throw new Error("GalleryAppStartupTimeout");
  } catch (error) { child.kill(); throw error; }
}
