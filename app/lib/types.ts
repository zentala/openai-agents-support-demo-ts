/**
 * Shared types for the server (agents, tools, runtime) AND the browser (panel).
 * No imports from server-only code here, so client components can use it.
 *
 * Concept: the AI SDK "UI message stream" can carry typed *data parts* next to
 * the chat text. `SupportDataParts` is the contract for those custom parts:
 * the server writes them, `useChat` hands them to `onData` in the browser.
 */
import type { UIMessage } from "ai";
import type { CustomerMessage, SenderInfo } from "./message-kinds";
export type { CustomerMessage, SenderInfo } from "./message-kinds";

/**
 * Fields that code (not the customer) may change while a conversation runs.
 * They are written by the handoff hook and by order selection, kept per thread on the
 * server, and shown in the panel as "context updates".
 */
export const MUTABLE_CONTEXT_FIELDS = ["activeOrderId", "handoffReason"] as const;
export type MutableContextField = (typeof MUTABLE_CONTEXT_FIELDS)[number];
/** Slot-filling drafts: the values collected so far for a form. Kept in the run context, per thread. */
export type ClaimDraft = { orderId?: string; item?: string; damage?: string; noticedAt?: string; photoId?: string };
export type AddressDraft = { orderId?: string; street?: string; city?: string; postalCode?: string; country?: string };

export type MutableContext = { [K in MutableContextField]?: string } & { claimDraft?: ClaimDraft; addressDraft?: AddressDraft };

/** Customer id of a visitor who is not logged in. No order belongs to it, until verification binds the thread to a real customer. */
export const GUEST_ID = "guest";

/** Private guidance saved by the owning consultant, with its author and update time. */
export type StaffInstruction = { text: string; consultant: string; updatedAt: string };

/** Logged-in customer + thread; passed to `run()` as the typed run context. */
export type SupportContext = {
  customerId: string;
  customerName: string;
  language?: string;
  threadId: string;
  /** Trace id of the conversation; tickets carry it so a consultant can open the OpenAI trace. */
  traceId?: string;
  /** Server-owned guidance for this thread; never a mutable model/customer field. */
  staffInstruction?: StaffInstruction;
  /** Normalized current customer input, supplied only by the turn for workflow decisions. */
  customerMessage?: string;
} & MutableContext;

/** One changed context field: `null` means "not set". */
export type ContextChange = { from: string | null; to: string | null };

/** One row of the order picker card shown in the chat. */
export type OrderChoice = {
  orderId: string;
  summary: string;
  /** Names from the owned order, used only to select local catalog artwork. Older cards may omit them. */
  productNames?: string[];
  status: string;
  total: number;
  currency: string;
  /** False when the refund rules would refuse a return of this order (see `note`). */
  eligible: boolean;
  note?: string;
};

/**
 * Interactive card the Orders agent shows in the chat, so the customer clicks an order
 * instead of typing its number (our counterpart of the OpenAI demo's seat map).
 */
export type OrderPickerWidget = { type: "order-picker"; prompt: string; orders: OrderChoice[] };

/** A postal address (delivery address of an order). */
export type Address = { street: string; city: string; postalCode: string; country?: string };

/** Guarded inspector projection: no customer/order fields exist before guest verification. */
export type CustomerOrderView = { status: "unverified" } | {
  status: "verified";
  customer: { name: string; email: string; language: string; defaultAddress?: Address };
  order: {
    orderId: string;
    status: "delivered" | "in_transit";
    items: { name: string; qty: number; unitPrice: number }[];
    currency: string;
    deliveryAddress: Address;
  } | null;
};

/**
 * A form that posts straight to our server (POST /api/threads/<id>/secure-form), so the value never
 * passes through the model. It carries NO value: the card only says which field to ask for.
 */
export type SecureFormWidget = { type: "secure-form"; field: "iban" | "phone"; title: string; hint: string };

/** Optional photo upload for a damage claim (POST /api/threads/<id>/photo). */
export type PhotoUploadWidget = { type: "photo-upload"; prompt: string; maxBytes: number; acceptedTypes: string[] };

/** "Old vs new address" card; the change is applied only after the customer clicks Confirm. */
export type AddressConfirmWidget = {
  type: "address-confirm";
  proposalId: string;
  orderId: string;
  prompt: string;
  oldAddress: Address;
  newAddress: Address;
};

/** Every interactive card that can appear in a chat bubble. */
export type QuickReplyWidget = { type: "quick-replies"; offerId: string; threadId: string; prompt: string; yes: string; no: string };
export type ChatWidget = OrderPickerWidget | SecureFormWidget | PhotoUploadWidget | AddressConfirmWidget | QuickReplyWidget;

/** Structured result of a click on a widget; the server validates it, never the model. */
export type OrderSelection = { type: "order"; orderId: string };
export type AddressDecision = { type: "address"; orderId: string; proposalId: string; decision: "confirm" | "cancel" };
export type QuickReplyDecision = { type: "quick-reply"; offerId: string; decision: "yes" | "no" };
export type WidgetSelection = OrderSelection | AddressDecision | QuickReplyDecision;

/** One slot of a form in the Agent View: filled or missing. */
export type SlotView = { key: string; label: string; required: boolean; filled: boolean; value?: string };

export type KbHit = { id: string; title: string; snippet: string; score: number };
/** Public repository article, shown verbatim when a customer opens a citation. */
export type KbArticle = { id: string; title: string; body: string };

/** A pending human decision, shown in the consultant console (read-only in the Agent View). */
export type ApprovalRequest = {
  /** Inspector correlation saved with the pause, never inferred from the latest customer message. */
  turnId?: string;
  approvalId: string;
  threadId: string;
  traceId: string;
  toolName: string;
  args: unknown;
  customerId: string;
  customerName: string;
  agent: string;
  summary: string;
  /** Epoch milliseconds. */
  createdAt: number;
};

/** Who handles the conversation right now. */
export type HandlerStatus = "agent" | "human";

/** What happened under the hood. Each variant is one row/card in the panel. */
export type AgentEventBody =
  | { kind: "staff_instruction"; instruction: StaffInstruction | null }
  | { kind: "agent_active"; agent: string }
  | { kind: "handoff"; from: string; to: string }
  | { kind: "tool_call"; agent: string; tool: string; args: unknown }
  | { kind: "tool_output"; agent: string; tool: string; result: unknown }
  | {
      kind: "guardrail";
      stage: "input" | "output";
      name: string;
      passed: boolean;
      reasoning: string;
    }
  | { kind: "normalization"; stripped: string[]; before: string; after: string }
  | { kind: "context_update"; changes: Record<string, ContextChange> }
  | { kind: "widget"; widget: ChatWidget }
  | { kind: "kb_hits"; query: string; hits: KbHit[] }
  | { kind: "approval_request"; approval: ApprovalRequest }
  | { kind: "approval_decision"; approvalId: string; toolName: string; approved: boolean; decidedBy: string }
  | { kind: "escalation"; ticketId: string; source: "agent" | "rule"; reason: string }
  | { kind: "takeover"; status: HandlerStatus; consultant?: string; note?: string }
  /** Text pushed to the customer chat outside of a chat request (consultant reply, notice, resumed run). */
  | { kind: "chat_message"; entryId: string; role: "agent" | "consultant" | "system"; text: string; author?: string; sender?: SenderInfo; quickReplies?: QuickReplyWidget }
  /** Lifecycle of a delivery address change: proposed (card shown), applied (Confirm clicked), cancelled, refused. */
  | { kind: "address_change"; orderId: string; status: "proposed" | "applied" | "cancelled" | "refused"; detail?: string }
  /** Guest verification result. It never says which detail was wrong. */
  | { kind: "verification"; outcome: "verified" | "failed" | "locked"; customerId?: string; customerName?: string; attemptsLeft?: number }
  /** Slot filling progress of a form (damage claim, address change): which slots are filled, which are missing. */
  | { kind: "slots"; form: "damage-claim" | "address-change"; title: string; slots: SlotView[]; outcome?: string }
  /** A secure form stored a value in the vault. Only the status text is shown, never the value. */
  | { kind: "sensitive_stored"; field: "iban" | "phone"; status: string }
  | { kind: "error"; errorType: string; message: string; where: string }
  | { kind: "trace"; traceId: string; url: string };

export type AgentEvent = AgentEventBody & { id: string; ts: number; turnId?: string };

/** Who wrote a pushed chat bubble; the chat draws consultant and system lines differently. */

/**
 * Custom data parts of our chat stream. `data-agent-event` is transient (panel only);
 * `data-widget` and `data-sender` are stored in the message and drawn in the chat bubble.
 */
export type SupportDataParts = {
  "agent-event": AgentEvent;
  widget: ChatWidget;
  sender: SenderInfo;
  messages: CustomerMessage[];
};

export type SupportUIMessage = UIMessage<unknown, SupportDataParts>;

/**
 * Body fields the browser adds to every chat request. The customer is NOT in here: it is stored on the
 * server with the thread, which the browser can only reach with the thread's credential cookie.
 */
export type ChatRequestBody = {
  threadId: string;
  /** Set when the message comes from a click on a chat widget. */
  selection?: WidgetSelection;
};
