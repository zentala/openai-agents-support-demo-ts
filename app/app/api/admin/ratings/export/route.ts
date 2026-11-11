/**
 * Export ratings as eval scenarios (GET): the JSON has the shape of data/scenarios.json,
 * so it can be reviewed and pasted into that file, then replayed with `just eval`.
 */
import { ratingsToScenarios } from "@/lib/admin/ratings-export";
import { listRatings } from "@/lib/data/store";
import { canInspectThread } from "@/lib/admin/visitor-access";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const scenarios = ratingsToScenarios(listRatings().filter((record) => canInspectThread(req, record.threadId)));
  return new Response(JSON.stringify(scenarios, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="rated-scenarios.json"',
    },
  });
}
