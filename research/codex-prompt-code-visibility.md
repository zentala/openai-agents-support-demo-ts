Research task (read-only, use web search). Write the final answer in Polish, as a Markdown report.

Context: A developer (the developer) on Windows 11 is learning to build an AI customer-support agent in TypeScript (OpenAI Agents SDK for JS, Next.js, ChatKit UI). An AI coding agent (Claude Code, running inside the T3 Code desktop app which has an inline web preview pane; terminal work happens in a terminal host, a terminal multiplexer for agents) writes the code. the developer wants to LEARN while the agent works: he must SEE the code the agent writes, the key lines it changes and the terminal commands it runs, highlighted and explained, live, ideally in a web page the agent can open and navigate for him (e.g. "look at line 42 of agents.ts, this is the guardrail"). Educational, guided walkthroughs, not just raw diffs.

Find and compare concrete, existing, maintained tools/approaches (no building from scratch unless nothing exists) for:
1. Showing code in the browser that the agent can open at a specific file + line range with highlighting and annotations (e.g. code-server / openvscode-server, VS Code CodeTour extension, Monaco-based viewers, Shiki/Expressive Code pages, Sourcegraph, GitHub permalinks, diff viewers like diff2html, anything agent-controllable via URL or CLI).
2. Guided code walkthroughs/tours that an agent can generate as files (CodeTour .tour JSON, similar formats) and the human steps through.
3. Showing terminal activity live in a browser (ttyd, gotty, asciinema + player, xterm.js based tools, VS Code terminal in browser) so the human sees commands and output.
4. Ways an agent can "drive" the human's view (open file at line in VS Code via `code --goto file:line`, vscode:// URLs, code-server URLs, Live Share).
5. Any tools specifically built for watching/learning from AI coding agents in real time (agent activity viewers, session replays, Claude Code / Codex session viewers, MCP servers for editors).

Also check locally (read-only) what exists: run `where code`, `where code-server`, `where ttyd` and look in the optional local skills folder (harness command bindings) for helpers named open-md / open-diff to see what they do.

For each candidate: what it is, how the agent would trigger it (exact command/URL pattern), Windows support, maturity/maintenance (latest release date), cost, and how well it serves LEARNING. End with ONE ranked recommendation: the smallest setup (max 2-3 tools) that gives the developer (a) code at a line with explanation, (b) live terminal, (c) step-by-step tours; plus install commands. Mark anything you could not verify as UNVERIFIED. Cite source URLs.
