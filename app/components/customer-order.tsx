"use client";

/** Profile and current selected delivery, separate from model context and raw tool output. */
import { UserRound } from "lucide-react";
import type { Address, CustomerOrderView } from "@/lib/types";
import { useCustomerOrder } from "@/lib/client/use-customer-order";
import { PanelSection } from "./panel-section";
import { OrderItems } from "./order-items";

const addressText = (address: Address) => [address.street, `${address.postalCode} ${address.city}`, address.country].filter(Boolean).join(", ");

export function CustomerOrderDetails({ view }: { view: CustomerOrderView }) {
  if (view.status === "unverified") return <p className="text-sm text-zinc-700">Verify the guest before viewing customer or order details.</p>;
  const { customer, order } = view;
  return <div className="space-y-3 text-sm text-zinc-900">
    <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2">
      <dt className="text-zinc-700">Name</dt><dd className="wrap-anywhere">{customer.name}</dd>
      <dt className="text-zinc-700">Email</dt><dd className="wrap-anywhere">{customer.email}</dd>
      <dt className="text-zinc-700">Language</dt><dd className="wrap-anywhere">{customer.language}</dd>
      <dt className="text-zinc-700">Default address</dt><dd className="wrap-anywhere">{customer.defaultAddress ? addressText(customer.defaultAddress) : "Not recorded"}</dd>
    </dl>
    {order ? <div className="space-y-2 border-t border-gray-200 pt-3" data-testid="customer-active-order">
      <h3 className="font-semibold">Active order #{order.orderId}</h3>
      <p>Status: {order.status === "in_transit" ? "In transit" : "Delivered"}</p>
      <OrderItems items={order.items} currency={order.currency} />
      <p className="wrap-anywhere"><span className="text-zinc-700">Current delivery address: </span>{addressText(order.deliveryAddress)}</p>
    </div> : <p className="text-zinc-600">No active order selected.</p>}
  </div>;
}

export function CustomerOrder({ threadId, revision }: { threadId: string | null; revision: string }) {
  const snapshot = useCustomerOrder(threadId, revision);
  return <PanelSection title="Customer & order" icon={<UserRound aria-hidden="true" className="h-4 w-4 text-blue-600" />} testId="customer-order">
    {snapshot?.error ? <p role="alert" className="text-sm text-red-900">{snapshot.error}</p>
      : snapshot?.data ? <CustomerOrderDetails view={snapshot.data} /> : <p className="text-sm text-zinc-600">Loading customer & order…</p>}
  </PanelSection>;
}
