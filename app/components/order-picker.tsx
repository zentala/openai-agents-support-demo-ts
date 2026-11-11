"use client";

/**
 * The order picker card inside a chat bubble: one button per order. A click sends a
 * structured selection (see `send` with a selection in use-support-session). Shown by the Orders
 * agent through the `show_order_picker` tool; our counterpart of the OpenAI demo's seat map.
 *
 * Accessible: a labelled group of real buttons (keyboard + screen reader), the chosen order
 * is `aria-pressed`, and orders the refund rules would refuse say why instead of just being dimmed.
 */
import type { OrderPickerWidget } from "@/lib/types";

type Props = {
  widget: OrderPickerWidget;
  /** Order currently stored in the run context; it is shown as selected. */
  selectedOrderId?: string;
  /** False once the customer moved on (a newer message exists) or while the agent is working. */
  active: boolean;
  onPick: (orderId: string, text: string) => void;
};

export function OrderPicker({ widget, selectedOrderId, active, onPick }: Props) {
  return (
    <section
      role="group"
      aria-label={widget.prompt}
      data-testid="order-picker"
      className="mt-2 max-w-[85%] rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">{widget.prompt}</p>
      <ul className="space-y-1.5">
        {widget.orders.map((order) => {
          const selected = order.orderId === selectedOrderId;
          return (
            <li key={order.orderId}>
              <button
                type="button"
                data-testid={`order-choice-${order.orderId}`}
                aria-pressed={selected}
                disabled={!active}
                title={order.note}
                onClick={() => onPick(order.orderId, `I pick order #${order.orderId} (${order.summary}, ${order.total} ${order.currency}).`)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-default ${
                  selected ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white enabled:hover:bg-blue-50"
                } ${order.eligible ? "" : "opacity-70"}`}
              >
                <span className="font-medium">#{order.orderId}</span> <span>{order.summary}</span>
                <span className="block text-xs text-zinc-600">
                  {order.total} {order.currency} - {order.status}
                </span>
                {order.note && <span className="block text-xs text-red-600">{order.note}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
