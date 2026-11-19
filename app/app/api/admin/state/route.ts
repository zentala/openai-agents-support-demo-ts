/**
 * Console state (GET): tickets, pending approvals, audit log, metrics. The page polls this every
 * couple of seconds, which is enough for a demo and needs no second channel.
 */
import { buildAdminState } from "@/lib/admin/state";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return Response.json(buildAdminState(req), { headers: { "Cache-Control": "no-store" } });
}
