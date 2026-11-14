"use client";

/** Static teaching view: the same scenario objects power these actions, the menu and evals. */
import { displayScenarioLabel, scenarios, type Scenario } from "@/lib/eval/scenarios";

const layers = [
  ["Input cleanup", "Remove mail noise and mask payment data before any model sees it.", "app/lib/guardrails/normalize-input.ts", "iphone-signature", "card-number"],
  ["Escalation rules", "Requests for a person and legal or GDPR terms go straight to a human.", "app/lib/escalation/rules.ts", "human-request", "gdpr-delete"],
  ["Input guardrails", "Classifiers check jailbreak attempts and relevance before Triage runs.", "app/lib/guardrails/input-guardrails.ts", "injection-direct", "off-topic"],
  ["Triage + handoffs", "Triage sends the question to the specialist with the right tools.", "app/lib/agents/index.ts", "handoff-context", "german-returns"],
  ["Tools with code-enforced rules", "Tools enforce ownership, amounts and the return window independently of prompts.", "app/lib/tools/refund.ts", "foreign-order", "refund-expired"],
  ["Human approval", "A refund above the threshold pauses until a consultant approves or rejects it.", "app/lib/runtime/approvals.ts", "refund-over-threshold", "refund-rejected"],
  ["Output guardrail", "Code checks the answer for prompt fragments, payment data and other customers’ details.", "app/lib/guardrails/leak-detect.ts", "prompt-extraction"],
  ["Tracing", "A trace links agent activity, tool calls and approvals to the OpenAI viewer.", "app/lib/runtime/run-support.ts", "order-picker"],
] as const;

function LayerTag({ title }: { title: string }) {
  const model = title === "Input guardrails" || title === "Triage + handoffs";
  return <span data-layer-tag className={`rounded-md px-2 py-1 text-xs ${model ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-800"}`}>{model ? "AI model" : "Code"}</span>;
}

export function HowItWorks({ busy, onScenario }: { busy: boolean; onScenario: (scenario: Scenario) => void }) {
  return <article className="space-y-5 text-sm" data-testid="how-it-works">
    <div><h2 className="text-lg font-semibold">How it works</h2><p className="mt-1 text-zinc-700">A prompt is the instruction text given to an AI model. A jailbreak tries to make it ignore those instructions. A guardrail checks input or answers for unsafe content. Triage chooses the right specialist, and a handoff passes the conversation to that specialist. Follow these layers in the Agent tab.</p></div>
    <ol aria-label="Support pipeline">
      {layers.map(([title, sentence, path, ...ids], i) => <li key={title}>
        {i > 0 && <div aria-hidden="true" className="flex h-7 flex-col items-center justify-center"><span className="h-4 border-l border-blue-600" /><span className="border-x-4 border-t-4 border-x-transparent border-t-blue-600" /></div>}
        <div className="rounded-lg border border-gray-200 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{i + 1}. {title}</h3><LayerTag title={title} /></div><p className="mt-1">{sentence}</p><code className="mt-1 block break-all text-[13px] text-zinc-700">{path}</code>
          <div className="mt-3 flex flex-wrap gap-2" aria-label={`Try ${title}`}>{ids.map((id) => {
            const scenario = scenarios.find((s) => s.id === id)!;
            return <button key={id} disabled={busy} onClick={() => onScenario(scenario)} className="min-h-10 rounded-md border border-blue-300 px-3 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-50">{displayScenarioLabel(scenario.label)}</button>;
          })}</div>
        </div>
      </li>)}
    </ol>
    <section className="border-t border-gray-200 pt-4"><h2 className="mb-2 text-base font-semibold">Consultant guidance and feedback</h2>
      <p>Hand back can include a private note for the agent in this conversation. It guides the current case within the code-enforced rules. Ratings and corrections are feedback for future conversations: export them as eval scenarios to check later improvements.</p>
    </section>
    <section className="border-t border-gray-200 pt-4"><h2 className="mb-2 text-base font-semibold">Security model</h2>
      <p>Identity comes from the server session; tools enforce ownership. Signed cookies protect conversations, and admin authentication protects inspector data and human actions. Sensitive forms bypass the model. This in-memory demo has no real customer login.</p>
      <a href="/readme#security" target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center text-blue-700 underline">Read the security rules and demo limits in README</a>
    </section>
  </article>;
}
