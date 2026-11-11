"use client";

/**
 * "Conversation Context": the values the server passes to `run()` as the typed
 * context. Tools read the customer from here, never from the model's arguments.
 * Fields that code changed in the last `context_update` (handoff hook, widget click) are highlighted.
 */
import { BookText } from "lucide-react";
import { PanelSection } from "./panel-section";
import { Card, CardContent } from "./ui/card";

type Props = {
  context: Record<string, string | undefined>;
  /** Keys (as shown) changed by the latest context update. */
  changed: string[];
};

export function ConversationContext({ context, changed }: Props) {
  return (
    <PanelSection title="Conversation Context" icon={<BookText className="h-4 w-4 text-blue-600" />} testId="context">
      <Card className="bg-gradient-to-r from-white to-gray-50">
        <CardContent className="grid grid-cols-2 gap-2 p-3">
          {Object.entries(context).map(([key, value]) => {
            const isChanged = changed.includes(key);
            return (
              <div
                key={key}
                data-testid={`context-field-${key}`}
                data-changed={isChanged}
                className={`flex items-center gap-2 rounded-md border p-2 shadow-sm ${isChanged ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300" : "border-gray-200 bg-white"}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${isChanged ? "bg-green-500" : "bg-blue-500"}`} />
                <div className="min-w-0 text-xs">
                  <div className="text-zinc-600">
                    {key}:{isChanged && <span className="ml-1 font-medium text-blue-700">updated</span>}
                  </div>
                  {/* thread_id is random per page load, so server and browser HTML differ on purpose */}
                  <span data-context-value suppressHydrationWarning className={`break-words text-[13px] ${value ? "text-zinc-700" : "italic text-zinc-600"}`}>{value || "null"}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </PanelSection>
  );
}
