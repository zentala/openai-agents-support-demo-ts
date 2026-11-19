/**
 * Consultant console actions (POST): take over, reply, hand back, decide an approval, rate an answer.
 * Access is guarded by proxy.ts; validation and rules live in lib/admin/actions.ts.
 *
 * `decide_approval` resumes a paused agent run, so the request can take as long as a model call.
 */
import { actionSchema, runAdminAction } from "@/lib/admin/actions";
import { withRequestKey, redactValue } from "@/lib/security/request-key";
import { refuseForeignThread } from "@/lib/admin/visitor-access";
import { getPendingApproval } from "@/lib/runtime/approvals";

export const maxDuration = 120;

export async function POST(req: Request) {
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return Response.json({ ok: false, errorType: "InvalidRequest", message: `Bad console action: ${message}` }, { status: 400 });
  }
  const target = parsed.data.type === "decide_approval" ? getPendingApproval(parsed.data.approvalId)?.threadId : parsed.data.threadId;
  const refused = refuseForeignThread(req, target);
  if (refused) return refused;
  const result = await withRequestKey(req, () => runAdminAction(redactValue(parsed.data)));
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
