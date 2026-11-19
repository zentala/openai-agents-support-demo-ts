"use client";

import { useVisitorKey } from "@/components/visitor-key";

/**
 * Browser state of the consultant console: polls the server, remembers the picked consultant and the
 * open conversation, and sends actions.
 *
 * Polling (every 1.5 s) instead of a second SSE channel: the console is a work list, a short delay is
 * fine, and polling needs no connection management. The customer chat is the part that needs push.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CONSULTANTS } from "@/lib/admin/consultants";
import type { ActionResponse, AdminAction, AdminState, ThreadView } from "@/lib/admin/types";
import { adminActionResponse, adminResponse } from "./admin-response";

const POLL_MS = 1500;
const HASH_PREFIX = "#thread=";

/** An action without the consultant: the hook adds the one picked in the selector. */
export type ConsoleAction = AdminAction extends infer A ? (A extends { consultant: string } ? Omit<A, "consultant"> : never) : never;

const threadFromHash = (): string | undefined =>
  window.location.hash.startsWith(HASH_PREFIX) ? decodeURIComponent(window.location.hash.slice(HASH_PREFIX.length)) : undefined;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  return adminResponse<T>(response);
}

/** Server data: the state, the open conversation (kept in the URL hash), refreshed on a timer. */
function useConsoleData() {
  const [state, setState] = useState<AdminState | null>(null);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [thread, setThread] = useState<ThreadView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef(threadId);

  const refresh = useCallback(async () => {
    const open = threadRef.current;
    try {
      setState(await getJson<AdminState>("/api/admin/state"));
      const view = open ? await getJson<ThreadView>(`/api/admin/threads/${encodeURIComponent(open)}`) : null;
      if (threadRef.current === open) setThread(view);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const select = useCallback(
    (id: string | undefined) => {
      if (threadRef.current !== id) setThread(null);
      threadRef.current = id;
      setThreadId(id);
      window.location.hash = id ? `${HASH_PREFIX}${encodeURIComponent(id)}` : "";
      void refresh();
    },
    [refresh],
  );

  useEffect(() => {
    const syncHash = () => {
      const next = threadFromHash();
      if (threadRef.current !== next) setThread(null);
      threadRef.current = next;
      setThreadId(threadRef.current);
      void refresh();
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearInterval(timer);
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [refresh]);

  return { state, threadId, thread, error, setError, select, refresh };
}

export function useAdminConsole() {
  const { headers } = useVisitorKey();
  const [consultant, setConsultant] = useState<string>(CONSULTANTS[0]);
  const [acting, setActing] = useState(false);
  const { setError, refresh, ...data } = useConsoleData();

  /** Sends one action; a refusal from the server is shown as `type: message`, never swallowed. */
  const perform = useCallback(
    async (action: ConsoleAction): Promise<ActionResponse> => {
      setActing(true);
      try {
        const response = await fetch("/api/admin/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers() },
          body: JSON.stringify({ ...action, consultant }),
        });
        const result = await adminActionResponse(response);
        await refresh();
        setError(result.ok || result.errorType === "StaffToneWarning" ? null : `${result.errorType}: ${result.message}`);
        return result;
      } catch (e) {
        setError(`ActionFailed: ${e instanceof Error ? e.message : String(e)}`);
        return { ok: false, errorType: "ActionFailed", message: e instanceof Error ? e.message : String(e) };
      } finally {
        setActing(false);
      }
    },
    [consultant, refresh, setError, headers],
  );

  const act = useCallback(async (action: ConsoleAction) => (await perform(action)).ok, [perform]);
  return { consultant, setConsultant, acting, act, perform, refresh, setError, ...data };
}

export type AdminConsole = ReturnType<typeof useAdminConsole>;
