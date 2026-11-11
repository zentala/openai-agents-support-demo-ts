"use client";

/** Tab-memory key control. Context shares headers with chat and consultant actions only. */
import { createContext, useCallback, useContext, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { visitorKeyHeaders } from "@/lib/client/key-transport";

const noLocationEvents = () => () => {};

const KeyContext = createContext({ publicDemo: false, allowReset: true,
  key: "", setKey: (value: string) => { void value; }, headers: (): Record<string, string> => ({}) });

export function VisitorKeyProvider({ children, publicDemo, allowReset }: {
  children: ReactNode; publicDemo: boolean; allowReset: boolean;
}) {
  const [key, updateKey] = useState("");
  const current = useRef("");
  const setKey = useCallback((value: string) => { current.current = value; updateKey(value); }, []);
  // SECURITY: the ref avoids stale transport headers. No storage, cookies or URL parameters.
  const headers = useCallback((): Record<string, string> =>
    visitorKeyHeaders(current.current, publicDemo, window.location.href), [publicDemo]);
  return <KeyContext.Provider value={{ publicDemo, allowReset, key, setKey, headers }}>{children}</KeyContext.Provider>;
}

export const useVisitorKey = () => useContext(KeyContext);

export function VisitorKeyControl() {
  const { publicDemo, key, setKey } = useVisitorKey();
  // Protocol changes navigate the whole document. The server snapshot avoids hydration mismatches.
  const plainHttp = useSyncExternalStore(noLocationEvents, () => window.location.protocol === "http:", () => false);
  if (!publicDemo) return null;
  return <section className="shrink-0 space-y-2 border-b border-gray-200 p-3 text-sm" aria-label="OpenAI key settings">
    <label htmlFor="visitor-key" className="font-medium text-zinc-900">Your OpenAI key</label>
    <div className="flex items-center gap-2">
      <input id="visitor-key" data-testid="visitor-key" type="password" autoComplete="off" spellCheck={false}
        value={key} onChange={(event) => setKey(event.target.value)} aria-describedby="visitor-key-help"
        className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm" />
      <button type="button" onClick={() => setKey("")} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium hover:bg-gray-100">Clear</button>
    </div>
    {plainHttp && <p role="alert" data-testid="key-https-warning" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">Use HTTPS before entering a key on a shared host. Keys cannot be sent over plain HTTP, except on loopback for local development.</p>}
    <p id="visitor-key-help" className="text-zinc-700">Stays in this browser tab; sent only to this server for your requests; never stored or logged. HTTPS is required except on local loopback. Clearing or reloading removes it. Model usage is billed to your account.</p>
    <div className="flex flex-wrap gap-x-3 text-blue-700">
      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center gap-1 underline">Create a key <ExternalLink aria-hidden="true" className="h-3 w-3" /></a>
      <a href="https://platform.openai.com/settings/organization/limits" target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center gap-1 underline">Set a spend limit <ExternalLink aria-hidden="true" className="h-3 w-3" /></a>
    </div>
  </section>;
}
