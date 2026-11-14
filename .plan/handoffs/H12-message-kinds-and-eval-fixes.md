# H12 — message kinds (AI / human / automatic step) and the nine H11 eval failures

## TLDR

The owner found the chat misleading: text written by a fixed rule (escalation) looks exactly like
an AI answer, so a viewer can say "this is not a real AI chat". The owner approved a mockup that
gives every chat entry a visible author. H12 implements it and fixes the nine eval failures from
H11 (quick replies depended on the model calling a tool; two regressions). Points: {ok. 14p}.
Importance: High. Effort: high. H11 and H12 are published together only after a green eval.

## Approved design

Mockup: [.plan/mockups/2026-11-13-rule-vs-ai-messages.png](../mockups/2026-11-13-rule-vs-ai-messages.png)
(HTML source next to it). Record it in DESIGN.md (decision row) before code.

## Tasks

| # | Pts | Task |
|---|---|---|
| F1 | 5 | Every customer-visible chat entry has an author kind in the data model: `ai`, `human`, `system`. **AI**: plain text with a small "✦ AI assistant" label (blue, lucide `Sparkles`) above every model answer. **Human**: existing emerald bubble, label "Name · human". **System / automatic step**: never a message bubble and never under the AI label; a centered two-line card: line 1 = title (e.g. "Passed to a human") + a GitHub-style segmented badge `[Ticket icon + "Ticket" | T-2002 | waiting]` (amber, ID in monospace) + a grey badge "⚙ Automatic step" aligned right; line 2 = one sentence on what happens next. Apply it to every deterministic customer-visible output: escalation rules, guardrail refusals ("Blocked by a safety check"), errors such as VisitorKeyRequired, stale-card refusals. Join/leave notices stay thin centered lines. Consultant console transcript uses the same kinds. Tests: each producer emits the right kind (real producer → real renderer, no mocks on both sides). |
| F2 | 1 | Citation chip gets a lucide `BookOpen` icon before the article title, as in the mockup. |
| G1 | 3 | Quick replies come from conversation state in code (pending refund confirmation, pending escalation offer recorded by the tool/flow), not from the model choosing to call `offer_reply_choices`. Fixes kb-unknown-yes, refund-confirmation-choices, refund-confirmation-declined, escalation-offer-declined. |
| G2 | 3 | Regressions from H11 prompt changes: claim-slot-filling (submit_claim not called) and address-change-confirm (no proposal pending). Find the prompt/tool change that broke them; restore behavior without losing H11 fixes. |
| G3 | 2 | refund-cancel-repeat (REFUND_ALREADY_CANCELLED not returned), staff-handback-context (note not used), damage-refund-human (no refund/approval in the long story). Fix the product, never weaken the scenario. |

## Constraints

Same as H11: DESIGN.md first, commit per item, lease released after each commit, no push, no
AI attribution, `just check` green. **Eval is gated by the owner's spend approval:** when the code is
ready, STOP and report the planned scenario list (the nine H11 failures + Security & guardrails)
and cost estimate; run it only after the coordinator confirms. Inject the key the H10 way
(`PASSWORD_BROKER_SCRIPT` + `node scripts/with-key.mjs`).

## Acceptance

`just check`, `just build`, restart, layout smoke; screenshots `docs/screenshots/h12-*.png` at
1440 and 390 showing the automatic-step card, AI label, human label and a citation chip;
independent image review against the mockup; eval table. Report:
[implementation report](H12-message-kinds-and-eval-fixes-report.md).
