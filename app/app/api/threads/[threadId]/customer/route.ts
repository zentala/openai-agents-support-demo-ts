/** Customer-authorized snapshot for the Agent View customer tab. */
import { currentAddress, getCustomer, listClaims, listOrdersForCustomer, listRefunds, listTickets } from "@/lib/data/store";
import { GUEST_ID } from "@/lib/types";
import { authorizeThread } from "@/lib/security/thread-access";

export const dynamic = "force-dynamic";

const maskEmail = (email: string): string => {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
};

export async function GET(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const access = authorizeThread(request, threadId);
  if (!access.ok) return access.response;
  const { thread } = access;
  if (thread.customerId === GUEST_ID) return Response.json({ status: "unverified" }, { headers: { "Cache-Control": "no-store" } });

  const customer = getCustomer(thread.customerId);
  if (!customer) return Response.json({ status: "unverified" }, { headers: { "Cache-Control": "no-store" } });
  const allowedOrderId = thread.verifiedGuestOrderId;
  const orders = listOrdersForCustomer(customer.id).filter((order) => !allowedOrderId || order.id === allowedOrderId);
  const orderIds = new Set(orders.map((order) => order.id));
  const tickets = listTickets().filter((row) => row.threadId === threadId);
  const openTicket = tickets.find((ticket) => ticket.status === "open");
  const ticketState = openTicket
    ? thread.takeover.status === "human" ? `Taken over by ${thread.takeover.consultant} · ${openTicket.id}` : `Open in consultant queue · ${openTicket.id}`
    : tickets.length && thread.handedBackBy ? `Closed after hand-back by ${thread.handedBackBy} · ${tickets.at(-1)?.id}` : "None";
  const snapshot = {
    status: "verified",
    verification: allowedOrderId ? "verified_guest" : "verified_customer",
    customer: { name: customer.name, language: customer.language, email: maskEmail(customer.email) },
    ...(allowedOrderId ? {} : { savedAddress: customer.defaultAddress }),
    orders: orders.map((order) => ({
      id: order.id,
      status: order.status,
      deliveredDate: order.deliveredDaysAgo === null ? null : new Date(Date.now() - order.deliveredDaysAgo * 86_400_000).toISOString().slice(0, 10),
      items: order.items,
      address: { ...currentAddress(order), country: order.deliveryCountry },
    })),
    refunds: listRefunds().filter((row) => row.customerId === customer.id && orderIds.has(row.orderId)),
    claims: listClaims().filter((row) => row.customerId === customer.id && orderIds.has(row.orderId)),
    tickets,
    agentContext: { activeOrderId: thread.memory.activeOrderId ?? null, handoffReason: thread.memory.handoffReason ?? null, ticketState },
  };
  return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
