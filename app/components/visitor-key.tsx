"use client";

/**
 * Tab-memory key control. Context shares headers with chat and consultant actions only.
 * The context also owns "point at the key field": any error that needs a key calls `focusKeyField()`,
 * so no component reaches into the DOM of another.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { visitorKeyHeaders } from "@/lib/client/key-transport";

const noLocationEvents = () => () => {};
/** How long the key field stays highlighted after it is pointed at. */
const HIGHLIGHT_MS = 2000;

const KeyContext = createContext({ publicDemo: false, allowReset: true,
  key: "", setKey: (value: string) => { void value; }, headers: (): Record<string, string> => ({}),
  highlighted: false, fieldMounted: false, registerField: (element: HTMLInputElement | null) => { void element; }, focusKeyField: () => {} });

export function VisitorKeyProvider({ children, publicDemo, allowReset }: {
  children: ReactNode; publicDemo: boolean; allowReset: boolean;
}) {
  const [key, updateKey] = useState("");
  const [highlighted, setHighlighted] = useState(false);
  const [fieldMounted, setFieldMounted] = useState(false);
  const current = useRef("");
  const field = useRef<HTMLInputElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const setKey = useCallback((value: string) => { current.current = value; updateKey(value); }, []);
  // SECURITY: the ref avoids stale transport headers. No storage, cookies or URL parameters.
  const headers = useCallback((): Record<string, string> =>
    visitorKeyHeaders(current.current, publicDemo, window.location.href), [publicDemo]);
  const registerField = useCallback((element: HTMLInputElement | null) => {
    field.current = element;
    setFieldMounted(element !== null);
  }, []);
  const focusKeyField = useCallback(() => {
    field.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    field.current?.focus({ preventScroll: true });
    setHighlighted(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHighlighted(false), HIGHLIGHT_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <KeyContext.Provider value={{ publicDemo, allowReset, key, setKey, headers, highlighted, fieldMounted, registerField, focusKeyField }}>{children}</KeyContext.Provider>;
}

export const useVisitorKey = () => useContext(KeyContext);

/** An error that needs a key becomes a button: it scrolls to the key field, focuses and highlights it. */
export function KeyRequiredButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { focusKeyField, fieldMounted } = useVisitorKey();
  // The consultant console has no key field: a button there would do nothing.
  if (!fieldMounted) return <span className={className}>{children}</span>;
  return <button type="button" data-testid="key-required-action" onClick={focusKeyField}
    className={`text-left text-blue-700 underline ${className}`}>{children}</button>;
}

const LINK = "inline-flex items-center gap-0.5 text-blue-700 underline";
const GROUP = "flex h-10 rounded-md border bg-white transition-shadow focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600";

export function VisitorKeyControl() {
  const { publicDemo, key, setKey, highlighted, registerField } = useVisitorKey();
  // Protocol changes navigate the whole document. The server snapshot avoids hydration mismatches.
  const plainHttp = useSyncExternalStore(noLocationEvents, () => window.location.protocol === "http:", () => false);
  if (!publicDemo) return null;
  return <section className="shrink-0 space-y-2 border-b border-gray-200 p-3 text-sm" aria-label="OpenAI key settings">
    <div data-testid="visitor-key-group" data-highlighted={highlighted}
      className={`${GROUP} ${highlighted ? "border-blue-600 ring-4 ring-blue-300" : "border-gray-300"}`}>
      {/* Floating label: the placeholder-shown input keeps the label inside; focus or text lifts it onto the top border. */}
      <div className="relative min-w-0 flex-1">
        <input id="visitor-key" data-testid="visitor-key" ref={registerField} type="password" autoComplete="off" spellCheck={false}
          placeholder=" " value={key} onChange={(event) => setKey(event.target.value)} aria-describedby="visitor-key-help"
          className="peer h-full w-full min-w-0 rounded-l-md bg-transparent px-3 text-sm outline-none" />
        <label htmlFor="visitor-key"
          className="pointer-events-none absolute left-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 bg-white px-1 text-sm text-zinc-700 transition-all peer-focus:-top-px peer-focus:text-xs peer-focus:text-blue-700 peer-[:not(:placeholder-shown)]:-top-px peer-[:not(:placeholder-shown)]:text-xs">
          <Icon name="apiKey" aria-hidden="true" className="h-3.5 w-3.5" />Your OpenAI key
        </label>
      </div>
      <button type="button" onClick={() => setKey("")} className="inline-flex h-full items-center gap-2 rounded-r-md border-l border-gray-300 bg-white px-3 text-sm font-medium hover:bg-gray-100"><Icon name="clear" />Clear</button>
    </div>
    {plainHttp && <p role="alert" data-testid="key-https-warning" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">Use HTTPS before entering a key on a shared host. Keys cannot be sent over plain HTTP, except on loopback for local development.</p>}
    <p id="visitor-key-help" className="text-xs text-zinc-700">
      Stays in this browser tab; sent only to this server for your requests; never stored or logged. HTTPS is required except on local loopback. Clearing or reloading removes it. Model usage is billed to your account. When you use a key, agent traces are exported with it and appear in your OpenAI dashboard.{" "}
      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className={LINK}>Create a key <Icon name="external" aria-hidden="true" className="h-3 w-3" /></a>{" "}
      <a href="https://platform.openai.com/settings/organization/limits" target="_blank" rel="noreferrer" className={LINK}>Set a spend limit <Icon name="external" aria-hidden="true" className="h-3 w-3" /></a>
    </p>
  </section>;
}
