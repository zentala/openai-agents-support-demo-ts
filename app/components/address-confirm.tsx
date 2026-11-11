"use client";

/**
 * Address change confirmation card: old address next to the new one, and two buttons. The change is applied
 * by the SERVER only when the Confirm click arrives as a structured selection - typing "yes, confirm" in the
 * chat changes nothing. The card stays clickable while the customer chats on (they may type "yes" first); it is
 * locked after the first click, and the server refuses a second one anyway.
 */
import { useState } from "react";
import type { Address, AddressConfirmWidget } from "@/lib/types";
import type { WidgetActions } from "./widget-actions";

const oneLine = (a: Address) => `${a.street}, ${a.postalCode} ${a.city}`;

export function AddressConfirm({ widget, active, actions }: { widget: AddressConfirmWidget; active: boolean; actions: WidgetActions }) {
  const [answered, setAnswered] = useState(false);
  const answer = (decision: "confirm" | "cancel") => {
    setAnswered(true);
    actions.onSend(decision === "confirm" ? `Yes, change the delivery address of order #${widget.orderId}.` : "No, keep the current address.", {
      type: "address",
      orderId: widget.orderId,
      proposalId: widget.proposalId,
      decision,
    });
  };
  return (
    <section data-testid="address-confirm" role="group" aria-label={widget.prompt} className="mt-2 max-w-[85%] rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">{widget.prompt}</p>
      <dl className="space-y-1.5 text-sm">
        <div className="min-h-8 rounded-md bg-gray-50 p-2">
          <dt className="text-xs text-zinc-600">Current address</dt>
          <dd data-testid="address-old">{oneLine(widget.oldAddress)}</dd>
        </div>
        <div className="min-h-8 rounded-md bg-blue-50 p-2">
          <dt className="text-xs text-blue-700">New address</dt>
          <dd data-testid="address-new" className="font-medium">{oneLine(widget.newAddress)}</dd>
        </div>
      </dl>
      <div className="mt-3 flex gap-2">
        <button type="button" data-testid="address-confirm-yes" disabled={!active || answered} onClick={() => answer("confirm")} className="min-h-8 rounded-md bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm text-white disabled:opacity-50">
          Confirm change
        </button>
        <button type="button" data-testid="address-confirm-no" disabled={!active || answered} onClick={() => answer("cancel")} className="min-h-8 rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50">
          Cancel
        </button>
      </div>
    </section>
  );
}
