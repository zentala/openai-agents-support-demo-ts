"use client";

/** Reload the existing guarded thread projection on relevant inspector events and completed turns. */
import { useEffect, useState } from "react";
import type { AgentEvent, CustomerOrderView } from "@/lib/types";
import type { ThreadView } from "@/lib/admin/types";
import { adminResponse } from "./admin-response";

export function customerOrderRevision(events: AgentEvent[], replySent: boolean): string {
  const latest = events.filter((event) => ["context_update", "verification", "address_change", "approval_decision", "chat_message"].includes(event.kind)).at(-1);
  return `${latest?.id ?? "initial"}:${replySent}`;
}

export function useCustomerOrder(threadId: string | null, revision: string) {
  const requestKey = `${threadId}:${revision}`;
  const [snapshot, setSnapshot] = useState<{ key: string; data?: CustomerOrderView; error?: string }>();
  useEffect(() => {
    if (!threadId) return;
    const controller = new AbortController();
    let active = true;
    void fetch(`/api/admin/threads/${encodeURIComponent(threadId)}`, { cache: "no-store", signal: controller.signal })
      .then(adminResponse<ThreadView>)
      .then((view) => { if (active) setSnapshot({ key: requestKey, data: view.customerOrder }); })
      .catch((error: unknown) => {
        if (active) setSnapshot({ key: requestKey, error: error instanceof Error ? error.message : String(error) });
      });
    // SECURITY: a delayed response from another selection cannot repopulate the new customer's panel.
    return () => { active = false; controller.abort(); };
  }, [threadId, requestKey]);
  return snapshot?.key === requestKey ? snapshot : undefined;
}
