/**
 * Mock database: JSON files loaded once + in-memory lists for new refunds,
 * tickets, approval audit records and answer ratings. Pure data access, no
 * business rules (rules live in lib/tools and lib/runtime).
 *
 * Why `globalThis`: Next.js dev mode reloads modules often; state kept in a
 * module variable would reset. Anything stored on `globalThis` survives.
 */
import customersJson from "@/data/customers.json";
import profilesJson from "@/data/customer-profiles.json";
import ordersJson from "@/data/orders.json";
import { clearVault } from "@/lib/sensitive/vault";
import type { Address } from "@/lib/types";

export type { Address };

/** `email` and `postalCode` come from the server-only profiles file: they are what guest verification checks. */
export type Customer = { id: string; name: string; language: string; email: string; postalCode: string };
export type OrderItem = { name: string; qty: number; unitPrice: number };
export type Order = {
  id: string;
  customerId: string;
  status: "delivered" | "in_transit";
  /** Stored relative to "today" so the 30-day return window stays valid forever. */
  deliveredDaysAgo: number | null;
  items: OrderItem[];
  /** Free text written by staff or a carrier. Untrusted: a note may contain an injection attempt. */
  note?: string;
  /** Cash on delivery orders are refunded to a bank account the customer must give us. */
  paymentMethod?: "card" | "cash_on_delivery";
  /** Where the order is delivered. Changes are kept separately (see `currentAddress`). */
  address: Address;
};
export type RefundRecord = {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  reason: string;
  createdAt: string;
  /** Where the money goes, masked ("bank account ending 1234"). The full number never leaves the vault. */
  payout?: string;
};
/** A damaged-item claim; created only from a draft that passed the full claim schema. */
export type ClaimRecord = {
  id: string;
  customerId: string;
  orderId: string;
  item: string;
  damage: string;
  /** ISO date (YYYY-MM-DD) the customer noticed the damage. */
  noticedAt: string;
  photoId?: string;
  createdAt: string;
};
/** An uploaded damage photo, held in memory. `threadId` ties it to the conversation that uploaded it. */
export type PhotoRecord = { id: string; threadId: string; mimeType: string; bytes: Buffer; fileName: string };
export type TicketRecord = {
  id: string;
  customerId: string;
  summary: string;
  createdAt: string;
  /** The conversation (for the transcript) and its OpenAI trace (for the audit). */
  threadId: string;
  traceId: string;
  /** Who created it: the agent's escalate_to_human tool or the escalation rules in code. */
  source: "agent" | "rule";
  reason: string;
  status: "open" | "resolved";
};
/** Who decided a paused action, when, and which trace it belongs to. */
export type AuditRecord = {
  id: string;
  approvalId: string;
  threadId: string;
  traceId: string;
  customerId: string;
  toolName: string;
  summary: string;
  decision: "approved" | "rejected";
  decidedBy: string;
  decidedAt: string;
};
/** A consultant's verdict on one agent answer; feeds the eval export. */
export type RatingRecord = {
  id: string;
  threadId: string;
  /** Transcript entry of the rated agent answer. */
  entryId: string;
  customerId: string;
  rating: "up" | "down";
  correction?: string;
  ratedBy: string;
  ratedAt: string;
  /** Customer messages of the conversation up to the rated answer, oldest first. */
  userTurns: string[];
  agentReply: string;
  tools: string[];
};

const profiles = profilesJson as Record<string, { email: string; postalCode: string }>;
export const customers: Customer[] = customersJson.map((customer) => ({ ...customer, ...profiles[customer.id] }));
export const orders: Order[] = ordersJson as Order[];

type Memory = {
  refunds: RefundRecord[];
  tickets: TicketRecord[];
  audit: AuditRecord[];
  ratings: RatingRecord[];
  claims: ClaimRecord[];
  photos: PhotoRecord[];
  /** orderId -> address the customer changed it to (the JSON order stays untouched). */
  addressChanges: Record<string, Address>;
};
const globals = globalThis as unknown as { __nordicMemory?: Memory };
const memory: Memory = (globals.__nordicMemory ??= { refunds: [], tickets: [], audit: [], ratings: [], claims: [], photos: [], addressChanges: {} });

export const orderTotal = (order: Order): number =>
  order.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

export function getCustomer(customerId: string): Customer | undefined {
  return customers.find((c) => c.id === customerId);
}

/** "#1001", " 1001 " and "1001" all mean the same order. */
export const normalizeOrderId = (raw: string): string => raw.replace(/[^0-9a-z-]/gi, "");

/**
 * SECURITY: the only way tools read orders. An order that belongs to someone
 * else is indistinguishable from one that does not exist, so a jailbroken model
 * cannot even learn which order numbers are real.
 */
export function findOrderForCustomer(customerId: string, rawOrderId: string): Order | undefined {
  const id = normalizeOrderId(rawOrderId);
  return orders.find((o) => o.id === id && o.customerId === customerId);
}

export const listOrdersForCustomer = (customerId: string): Order[] =>
  orders.filter((o) => o.customerId === customerId);

export const refundedSoFar = (orderId: string): number =>
  memory.refunds.filter((r) => r.orderId === orderId).reduce((sum, r) => sum + r.amount, 0);

export function addRefund(input: Omit<RefundRecord, "id" | "createdAt">): RefundRecord {
  const record = { ...input, id: `R-${1000 + memory.refunds.length + 1}`, createdAt: new Date().toISOString() };
  memory.refunds.push(record);
  return record;
}

export function addTicket(input: Omit<TicketRecord, "id" | "createdAt" | "status">): TicketRecord {
  const id = `T-${2000 + memory.tickets.length + 1}`;
  const record: TicketRecord = { ...input, id, createdAt: new Date().toISOString(), status: "open" };
  memory.tickets.push(record);
  return record;
}

export const findOpenTicketForThread = (threadId: string): TicketRecord | undefined =>
  memory.tickets.find((t) => t.threadId === threadId && t.status === "open");

/** A consultant handing the conversation back closes its tickets. */
export function resolveTicketsForThread(threadId: string): void {
  memory.tickets.filter((t) => t.threadId === threadId).forEach((t) => (t.status = "resolved"));
}

export function addAudit(input: Omit<AuditRecord, "id">): AuditRecord {
  const record = { ...input, id: `A-${memory.audit.length + 1}` };
  memory.audit.push(record);
  return record;
}

/** One rating per answer: rating the same answer again replaces the earlier verdict. */
export function saveRating(input: Omit<RatingRecord, "id">): RatingRecord {
  memory.ratings = memory.ratings.filter((r) => !(r.threadId === input.threadId && r.entryId === input.entryId));
  const record = { ...input, id: `RT-${memory.ratings.length + 1}` };
  memory.ratings.push(record);
  return record;
}

export function addClaim(input: Omit<ClaimRecord, "id" | "createdAt">): ClaimRecord {
  const record = { ...input, id: `CL-${3000 + memory.claims.length + 1}`, createdAt: new Date().toISOString() };
  memory.claims.push(record);
  return record;
}

/** At most 50 photos (100 MiB at the per-upload limit); full storage refuses new photos. */
export const MAX_PHOTOS_TOTAL = 50;

export function addPhoto(input: Omit<PhotoRecord, "id">): PhotoRecord | undefined {
  // SECURITY: enforce synchronously at insertion too; concurrent uploads can pass the route's precheck.
  if (memory.photos.length >= MAX_PHOTOS_TOTAL) return undefined;
  const record = { ...input, id: `PH-${memory.photos.length + 1}` };
  memory.photos.push(record);
  return record;
}

/** The address an order goes to now: the customer's confirmed change, or the original. */
export const currentAddress = (order: Order): Address => memory.addressChanges[order.id] ?? order.address;

export function setDeliveryAddress(orderId: string, address: Address): void {
  memory.addressChanges[orderId] = address;
}

/** Demo only: forget every refund, ticket, audit record, rating, claim, photo, address change and stored secret (the "Reset demo data" button). */
export function resetDemoData(): void {
  memory.claims.length = 0;
  memory.photos.length = 0;
  memory.addressChanges = {};
  clearVault();
  memory.refunds.length = 0;
  memory.tickets.length = 0;
  memory.audit.length = 0;
  memory.ratings.length = 0;
}

export const listRefunds = (): RefundRecord[] => [...memory.refunds];
export const listTickets = (): TicketRecord[] => [...memory.tickets];
export const listAudit = (): AuditRecord[] => [...memory.audit];
export const listRatings = (): RatingRecord[] => [...memory.ratings];
export const listClaims = (): ClaimRecord[] => [...memory.claims];
export const listPhotos = (): PhotoRecord[] => [...memory.photos];
