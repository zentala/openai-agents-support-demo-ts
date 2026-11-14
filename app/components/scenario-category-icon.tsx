/** One decorative domain icon per category, shared by start and menu. DESIGN.md owns the map. */
import { BadgeCheck, BookOpen, ClipboardList, Headset, Languages, MapPin, PackageSearch, Shield, UserRound } from "lucide-react";
import type { Scenario } from "@/lib/eval/scenarios";

const ICONS = { Orders: PackageSearch, Knowledge: BookOpen, Languages, "Address changes": MapPin,
  "Security & guardrails": Shield, "Refunds & approvals": BadgeCheck, "Human handoff": Headset,
  "Data collection": ClipboardList, "Guest mode": UserRound };

export function ScenarioCategoryIcon({ category }: { category: Scenario["category"] }) {
  const Icon = ICONS[category];
  return <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600" />;
}
