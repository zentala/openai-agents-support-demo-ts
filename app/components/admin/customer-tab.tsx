"use client";

/** Customer-scoped business snapshot for the Agent View. */
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { GUEST_ID, type AgentEvent } from "@/lib/types";

type Snapshot = {
  status: "unverified" | "verified";
  verification?: "verified_guest" | "verified_customer";
  customer?: { name: string; language: string; email: string };
  savedAddress?: Record<string, string>;
  orders?: { id: string; status: string; deliveredDate: string | null; items: { name: string; qty: number }[]; address: Record<string, string> }[];
  refunds?: { id: string; orderId: string; status: string; amount: number }[];
  claims?: { id: string; orderId: string; item: string; damage: string }[];
  tickets?: { id: string; status: string; category?: string; createdAt: string }[];
  agentContext?: { activeOrderId: string | null; handoffReason: string | null; ticketState: string };
};

const addressText = (address?: Record<string, string>) => address ? Object.values(address).filter(Boolean).join(", ") || "No saved address" : "No saved address";

const ticketCategoryLabel = (category?: string): string => ({
  delivery_dispute: "Delivery issue",
  consultant_complaint: "Consultant complaint",
  manager_review: "Manager review",
  manager_requested: "Manager requested",
  message_report: "Message report",
  answer_question: "Answer question",
} as Record<string, string>)[category ?? ""] ?? "Support";

function Section({ title, icon, children }: { title: string; icon: "customer" | "address" | "order" | "refund" | "claim" | "ticket" | "context"; children: ReactNode }) {
  return <section className="space-y-2">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
      <span className="rounded-md bg-blue-600/10 p-1.5"><Icon name={icon} aria-hidden="true" className="h-4 w-4 text-blue-600" /></span>{title}
    </h3>
    {children}
  </section>;
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-zinc-600">{children}</p>;
}

function ContextTiles({ snapshot }: { snapshot: Snapshot }) {
  const fields = [
    ["Language", snapshot.customer?.language ?? "Unknown"],
    ["Verification", snapshot.verification === "verified_guest" ? "Verified guest" : "Verified customer"],
    ["Ticket state", snapshot.agentContext?.ticketState ?? "None"],
    ["Active order", snapshot.agentContext?.activeOrderId ? `#${snapshot.agentContext.activeOrderId}` : "None"],
    ["Handoff reason", snapshot.agentContext?.handoffReason ?? "None"],
  ];
  return <div className="grid grid-cols-2 gap-2" data-testid="customer-context-tiles">
    {fields.map(([key, value]) => <div key={key} data-testid={`customer-context-${key.toLowerCase().replaceAll(" ", "-")}`} className="min-w-0 rounded-md border border-gray-200 bg-white p-2 shadow-sm">
      <div className="text-xs text-zinc-600">{key}</div><div className="break-words text-[13px] text-zinc-700">{value}</div>
    </div>)}
  </div>;
}

function GuestNotVerified() {
  return <div className="p-5"><Section title="Guest" icon="customer"><Empty>Not verified yet. Verify an order before customer records appear.</Empty></Section></div>;
}

export function CustomerTab({ threadId, selectedCustomerId, events }: { threadId: string | null; selectedCustomerId: string; events: AgentEvent[] }) {
  const [loaded, setLoaded] = useState<{ threadId: string; snapshot: Snapshot | null } | null>(null);
  useEffect(() => {
    let current = true;
    if (!threadId) return () => { current = false; };
    void fetch(`/api/threads/${encodeURIComponent(threadId)}/customer`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<Snapshot> : null)
      .then((snapshot) => { if (current) setLoaded({ threadId, snapshot }); })
      .catch(() => { if (current) setLoaded({ threadId, snapshot: null }); });
    return () => { current = false; };
  }, [threadId, events]);

  if (!threadId) return selectedCustomerId === GUEST_ID
    ? <GuestNotVerified />
    : <div className="p-5 text-sm text-zinc-600">Loading customer information…</div>;
  const snapshot = loaded?.threadId === threadId ? loaded.snapshot : null;
  if (!snapshot) return <div className="p-5 text-sm text-zinc-600">Loading customer information…</div>;
  if (snapshot.status === "unverified") return <GuestNotVerified />;

  const orders = snapshot.orders ?? [];
  const refunds = snapshot.refunds ?? [];
  const claims = snapshot.claims ?? [];
  const openTickets = snapshot.tickets?.filter((ticket) => ticket.status === "open") ?? [];
  return <div className="space-y-5 p-4 sm:p-5">
    <Section title={snapshot.customer?.name ?? "Customer"} icon="customer">
      <p className="text-sm text-zinc-600">{snapshot.verification === "verified_guest" ? "Verified guest" : "Verified customer"} · {snapshot.customer?.email} · {snapshot.customer?.language}</p>
    </Section>
    <Section title="Saved address" icon="address"><p className="break-words text-sm text-zinc-600">{addressText(snapshot.savedAddress)}</p></Section>
    <Section title="Orders" icon="order">
      {orders.length ? <div className="space-y-2">{orders.map((order) => <article key={order.id} className="rounded-md border border-gray-200 bg-white p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><strong>#{order.id}</strong><span className="text-zinc-600">{order.status}{order.deliveredDate ? ` · delivered ${order.deliveredDate}` : ""}</span></div>
        <p className="mt-1 text-zinc-700">{order.items.map((item) => `${item.qty} × ${item.name}`).join(", ")}</p>
        <p className="mt-1 break-words text-zinc-600">{addressText(order.address)}</p>
      </article>)}</div> : <Empty>No orders</Empty>}
    </Section>
    <Section title="Refunds" icon="refund">{refunds.length ? <p className="text-sm text-zinc-700">{refunds.map((row) => `${row.id} · #${row.orderId} · ${row.status} · ${row.amount.toFixed(2)}`).join("; ")}</p> : <Empty>No refunds</Empty>}</Section>
    <Section title="Claims" icon="claim">{claims.length ? <p className="text-sm text-zinc-700">{claims.map((row) => `${row.id} · #${row.orderId} · ${row.item}: ${row.damage}`).join("; ")}</p> : <Empty>No claims</Empty>}</Section>
    <Section title="Open tickets" icon="ticket">{openTickets.length ? <p className="text-sm text-zinc-700">{openTickets.map((row) => `${row.id} · ${ticketCategoryLabel(row.category)} · ${row.status}`).join("; ")}</p> : <Empty>No open tickets</Empty>}</Section>
    <Section title="What the agent knows" icon="context"><ContextTiles snapshot={snapshot} /></Section>
  </div>;
}
