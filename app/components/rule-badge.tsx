/** Rule-only scenarios share the same visible vocabulary in starters and the scenario menu. */
import { Badge } from "./ui/badge";

export function RuleBadge() {
  return <Badge tone="grey" icon="automaticStep" title="Code decides; no model call" className="shrink-0 font-normal">rule</Badge>;
}
