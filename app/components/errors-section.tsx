"use client";

/**
 * "Errors": every failure with its type, text and where it happened.
 * Nothing is swallowed - a generic "something went wrong" would hide the cause.
 */
import { AlertTriangle } from "lucide-react";
import type { AgentEvent } from "@/lib/types";
import { PanelSection } from "./panel-section";
import { Card, CardContent } from "./ui/card";

type ErrorEvent = Extract<AgentEvent, { kind: "error" }>;

export function ErrorsSection({ errors }: { errors: ErrorEvent[] }) {
  return (
    <PanelSection title="Errors" icon={<AlertTriangle className="h-4 w-4 text-blue-600" />} testId="errors">
      {errors.length === 0 && <p className="text-sm text-zinc-600">No errors.</p>}
      <div className="space-y-2">
        {errors.map((e) => (
          <Card key={e.id} data-testid="error-card" className="border-red-400 bg-red-50">
            <CardContent className="p-3 text-sm">
              <p className="font-mono font-semibold text-red-700">{e.errorType}</p>
              <p className="break-words text-zinc-800">{e.message}</p>
              <p className="text-xs text-zinc-600">where: {e.where}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PanelSection>
  );
}
