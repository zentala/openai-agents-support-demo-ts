/** One decorative domain icon per category, shared by start and menu. DESIGN.md owns the map. */
import { Icon } from "./icon";
import type { IconKey } from "@/lib/ui/icons";
import type { Scenario } from "@/lib/eval/scenarios";

export const CATEGORY_ICONS = { Orders: "order", Knowledge: "knowledge", Languages: "language", "Address changes": "address",
  "Security & guardrails": "security", "Refunds & approvals": "refund", "Human handoff": "consultant",
  "Data collection": "dataCollection", "Guest mode": "guest" } satisfies Record<Scenario["category"], IconKey>;

export function ScenarioCategoryIcon({ category }: { category: Scenario["category"] }) {
  return <Icon name={CATEGORY_ICONS[category]} className="h-4 w-4 shrink-0 text-blue-600" />;
}
