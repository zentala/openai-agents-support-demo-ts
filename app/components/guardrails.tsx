"use client";

/**
 * "Guardrails": one card per guardrail. Grey = not run yet, green = passed,
 * red = tripwire fired. The classifier's reasoning is shown on the card.
 */
import { CheckCircle, Shield, XCircle } from "lucide-react";
import { AGENT_CATALOG, GUARDRAIL_INFO } from "@/lib/agents/catalog";
import type { AgentEvent } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PanelSection } from "./panel-section";

type GuardrailEvent = Extract<AgentEvent, { kind: "guardrail" }>;

const ALL_GUARDRAILS = [...AGENT_CATALOG[0].inputGuardrails, "leak_guardrail"];

export function Guardrails({ results }: { results: GuardrailEvent[] }) {
  return (
    <PanelSection title="Guardrails" icon={<Shield className="h-4 w-4 text-blue-600" />} testId="guardrails">
      {results.length === 0 ? <p className="text-sm text-zinc-600">No guardrails have run this turn.</p> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ALL_GUARDRAILS.map((name) => {
          const result = results.find((r) => r.name === name);
          const info = GUARDRAIL_INFO[name];
          const status = !result ? "idle" : result.passed ? "passed" : "failed";
          return (
            <Card
              key={name}
              data-testid={`guardrail-${name}`}
              data-status={status}
              className={`${status === "idle" ? "opacity-60" : ""} ${status === "failed" ? "border-red-400 bg-red-50" : ""}`}
            >
              <CardHeader>
                <CardTitle>{info.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-1 text-xs text-zinc-600">{info.description}</p>
                {result && <p className="mb-1 text-xs text-zinc-700">{result.reasoning}</p>}
                {status === "failed" ? (
                  <Badge tone="red"><XCircle className="mr-1 h-4 w-4" />Failed</Badge>
                ) : (
                  <Badge tone={status === "passed" ? "green" : "grey"}>
                    {status === "passed" && <CheckCircle className="mr-1 h-4 w-4" />}
                    {status === "passed" ? "Passed" : "Not run yet"}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>}
    </PanelSection>
  );
}
