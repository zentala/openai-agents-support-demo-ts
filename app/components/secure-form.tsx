"use client";

/**
 * Secure form widget: the customer types a bank account or phone number HERE, and the browser posts it
 * straight to our server (POST /api/threads/<id>/secure-form). The value never goes into the chat request,
 * so the model never reads it. Only the server's status text ("IBAN_PROVIDED (last 4: 1234)") is shown and
 * reported back to the chat.
 *
 * SECURITY: the value lives only in this component's input state, which is cleared after a successful
 * submit, and the request relies on the thread's httpOnly cookie. No value is put in a URL, the chat
 * history or any event.
 */
import { Lock } from "lucide-react";
import { useState } from "react";
import type { SecureFormWidget } from "@/lib/types";
import type { WidgetActions } from "./widget-actions";

const LABEL: Record<SecureFormWidget["field"], string> = { iban: "bank account", phone: "phone number" };

type Reply = { ok: boolean; status?: string; message?: string; errorType?: string };

/** Posts the value to the secure form route. Returns the stored status, or the specific error to show. */
async function postSecret(threadId: string, field: SecureFormWidget["field"], value: string): Promise<{ status: string } | { error: string }> {
  try {
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/secure-form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    });
    const body = (await response.json()) as Reply;
    if (!response.ok || !body.status) return { error: `${body.errorType ?? "Error"}: ${body.message ?? `HTTP ${response.status}`}` };
    return { status: body.status };
  } catch (failure) {
    return { error: `Network error: ${(failure as Error).message}` };
  }
}

export function SecureForm({ widget, actions }: { widget: SecureFormWidget; actions: WidgetActions }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [stored, setStored] = useState<string>();
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!actions.threadId) return;
    setSending(true);
    setError(undefined);
    const result = await postSecret(actions.threadId, widget.field, value);
    setSending(false);
    if ("error" in result) return setError(result.error);
    setValue("");
    setStored(result.status);
    actions.onSend(`I entered my ${LABEL[widget.field]} in the secure form (${result.status}).`);
  };

  return (
    <section data-testid="secure-form" data-field={widget.field} aria-label={widget.title} className="mt-2 max-w-[85%] rounded-lg border border-emerald-300 bg-emerald-50/50 p-3 shadow-sm">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
        <Lock className="h-3.5 w-3.5" /> {widget.title}
      </p>
      <p className="mb-2 text-xs text-zinc-600">{widget.hint}</p>
      {stored ? (
        <p data-testid="secure-form-done" className="text-sm text-emerald-800">Saved: {stored}</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="flex gap-2">
          <input
            data-testid="secure-form-input"
            aria-label={LABEL[widget.field]}
            autoComplete="off"
            inputMode={widget.field === "phone" ? "tel" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 font-mono text-sm"
          />
          <button type="submit" data-testid="secure-form-submit" disabled={sending || !value.trim()} className="min-h-8 rounded-md bg-emerald-700 hover:bg-emerald-800 px-3 py-1 text-sm text-white disabled:opacity-50">
            Save securely
          </button>
        </form>
      )}
      {error && <p data-testid="secure-form-error" role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
