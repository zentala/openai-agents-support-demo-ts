# Purpose

## TLDR

The owner builds this project to learn the libraries by using them, to show the skills
in job interviews with a live demo, to enjoy building it, and to give others a working
example they can run and read. The product vision is in [VISION.md](VISION.md).

## Why

1. **Practice and learn.** Use the OpenAI Agents SDK for JS, the Vercel AI SDK, guardrails,
   approvals and evals on a real, non-trivial case, not in isolated snippets.
2. **Show skills in job interviews.** A live demo that runs on request: ask a question,
   watch the handoff, trip a guardrail, approve a refund. The code carries `// INTERVIEW:`
   talking points and `// SECURITY:` notes for this.
3. **Have fun building.** Pick the interesting problems (secure forms, takeover, evals)
   instead of the safe ones.
4. **Prepare for recruitment interviews.** The design notes and decisions
   ([ADR/](ADR/)) are material to explain and defend choices out loud.
5. **Share working examples.** Other people can see how it works and how to use it:
   a readable repository, a "How it works" tab in the app, a public demo.

## What this means for decisions

- Prefer clear, readable code over clever code. The code teaches
  (audience rule in [docs/BUILD-v1.md](../docs/BUILD-v1.md)).
- Prefer a feature that shows well in a live demo over a feature that is invisible.
- Record why we chose something, because an interviewer will ask.
