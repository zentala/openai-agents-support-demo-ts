"use client";

/**
 * "Form (slot filling)": shows, for each form the agent is filling in with the customer (damage claim,
 * address change), which slots are filled and which are still missing. The state is held by the server in
 * the run context; this panel only displays the latest `slots` event of each form.
 */
import { CheckCircle2, Circle, ClipboardList } from "lucide-react";
import type { AgentEvent } from "@/lib/types";
import { PanelSection } from "./panel-section";
import { Card, CardContent } from "./ui/card";

type SlotsEvent = Extract<AgentEvent, { kind: "slots" }>;

export function SlotsSection({ forms }: { forms: SlotsEvent[] }) {
  if (forms.length === 0) return null;
  return (
    <PanelSection title="Form filling (slots)" icon={<ClipboardList className="h-4 w-4 text-blue-600" />} testId="slots">
      <div className="space-y-3">
        {forms.map((form) => (
          <Card key={form.form} data-testid={`slots-${form.form}`}>
            <CardContent className="space-y-1.5 p-3">
              <p className="text-sm font-medium">
                {form.title}
                {form.outcome && <span data-testid="slots-outcome" className="ml-2 text-xs font-normal text-emerald-700">{form.outcome}</span>}
              </p>
              <ul className="grid grid-cols-2 gap-1.5">
                {form.slots.map((slot) => (
                  <li
                    key={slot.key}
                    data-testid={`slot-${form.form}-${slot.key}`}
                    data-filled={slot.filled}
                    className={`flex items-start gap-1.5 rounded-md border p-1.5 text-xs ${slot.filled ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white"}`}
                  >
                    {slot.filled ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />}
                    <span className="min-w-0">
                      <span className="block text-zinc-600">{slot.label}{slot.required ? "" : " (optional)"}</span>
                      <span className={`block break-words ${slot.filled ? "text-zinc-900" : "italic text-zinc-600"}`}>{slot.filled ? slot.value : "missing"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </PanelSection>
  );
}
