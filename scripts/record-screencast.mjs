/** Regenerate captioned README GIF/WebM from real human-request gallery frames; no browser, server or model calls. */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, statSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "docs", "media");
const scenario = JSON.parse(readFileSync(path.join(root, "site/data/scenarios.json"), "utf8")).find(s => s.id === "human-request");
if (scenario?.steps.length !== 4) throw new Error("ScreencastSource: record the four human-request gallery steps first");
const scratch = mkdtempSync(path.join(tmpdir(), "nordic-captioned-"));
const captions = ["Customer asks for a person", "A rule opens a ticket", "Consultant takes over", "Consultant replies in the same chat"];
const holds = [2.5, 3, 3, 4];
const duration = holds.reduce((sum, seconds) => sum + seconds, 0);
mkdirSync(output, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { cwd: scratch, windowsHide: true, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command}: ${result.error?.message || result.stderr || `exit ${result.status}`}`);
  return result.stdout;
}

function font() {
  const candidates = [process.env.SCREENCAST_FONT, process.env.WINDIR && path.join(process.env.WINDIR, "Fonts/segoeui.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf"].filter(Boolean);
  const source = candidates.find(file => existsSync(file));
  if (!source) throw new Error("ScreencastFontMissing: set SCREENCAST_FONT to a local TrueType font");
  copyFileSync(source, path.join(scratch, "font.ttf"));
}

function captionFrames() {
  const concat = [];
  for (const [index, step] of scenario.steps.entries()) {
    copyFileSync(path.join(root, "site", step.frame), path.join(scratch, `source${index}.webp`));
    writeFileSync(path.join(scratch, `caption${index}.txt`), `${index + 1}/4   ${captions[index]}`);
    // textfile avoids filter-language interpolation of editorial copy and paths.
    run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", `source${index}.webp`, "-vf",
      `scale=1120:700:flags=lanczos,pad=1120:788:0:0:color=0x18181b,drawtext=fontfile=font.ttf:textfile=caption${index}.txt:fontsize=24:fontcolor=white:x=24:y=730`,
      "-frames:v", "1", "-update", "1", `frame${index}.png`]);
    concat.push(`file 'frame${index}.png'`, `duration ${holds[index]}`);
  }
  // The concat demuxer needs one final file marker to retain the last duration.
  concat.push("file 'frame3.png'");
  writeFileSync(path.join(scratch, "frames.txt"), concat.join("\n") + "\n");
}

try {
  font(); captionFrames();
  const input = ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "frames.txt", "-t", String(duration), "-an"];
  run("ffmpeg", [...input, "-vf", "fps=10", "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", path.join(output, "support-demo.webm")]);
  const gif = path.join(output, "support-demo.gif");
  run("ffmpeg", [...input, "-vf", "split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle", "-fps_mode", "vfr", "-final_delay", "400", "-loop", "0", gif]);
  const bytes = statSync(gif).size;
  if (bytes > 3_000_000) throw new Error(`ScreencastTooLarge: ${bytes} bytes exceeds 3000000`);
  const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_frames", "-show_format", "-of", "json", gif]));
  const last = probe.frames.at(-1);
  const lastHold = Number(last.duration_time ?? last.pkt_duration_time);
  const seconds = Number(probe.format.duration);
  if (Math.abs(seconds - duration) > .11 || lastHold < 3.99) throw new Error(`ScreencastTiming: total ${seconds}s, last hold ${lastHold}s`);
  mkdirSync(path.join(root, "docs/screenshots"), { recursive: true });
  copyFileSync(path.join(scratch, "frame3.png"), path.join(root, "docs/screenshots/h14-screencast-last.png"));
  const evidence = `PASS captioned screencast: ${bytes} bytes, ${seconds}s total, ${lastHold}s final hold, ${probe.frames.length} encoded frames; no model calls\n`;
  console.log(evidence);
  writeFileSync(path.join(root, "research/H14-screencast.txt"), evidence);
} finally { rmSync(scratch, { recursive: true, force: true }); }
