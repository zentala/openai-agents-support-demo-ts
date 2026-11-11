/** Regenerate the README animation through the existing Playwright smoke, then encode it with ffmpeg. */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "docs", "media");
const scratch = mkdtempSync(path.join(tmpdir(), "nordic-screencast-"));
mkdirSync(output, { recursive: true });

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit", windowsHide: true });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

const raw = path.join(scratch, "source.webm");
await run(process.execPath, ["scripts/smoke-v1.mjs", process.argv[2] ?? "http://127.0.0.1:3100/", "--screencast"], { ...process.env, SCREENCAST_RAW: raw });
const common = ["-y", "-hide_banner", "-loglevel", "warning", "-i", raw, "-t", "20", "-an"];
await run("ffmpeg", [...common, "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-vf", "fps=20", path.join(output, "support-demo.webm")]);
await run("ffmpeg", [...common, "-vf", "fps=8,scale=1120:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle", "-loop", "0", path.join(output, "support-demo.gif")]);
const gifBytes = statSync(path.join(output, "support-demo.gif")).size;
if (gifBytes > 3_000_000) throw new Error(`ScreencastTooLarge: GIF is ${gifBytes} bytes (limit 3000000)`);
console.log(`Screencast ready: docs/media/support-demo.gif (${gifBytes} bytes) and docs/media/support-demo.webm; deterministic flow, no model calls.`);
