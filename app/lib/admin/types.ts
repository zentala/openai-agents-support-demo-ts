/**
 * Shapes the consultant console fetches from /api/admin/*. No server imports, so the browser can use them.
 */
import type { AuditRecord, TicketRecord } from "@/lib/data/store";
import type { TakeoverState } from "@/lib/runtime/takeover-state";
import type { TranscriptEntry } from "@/lib/runtime/threads";
import type { ApprovalRequest } from "@/lib/types";
import type { Metrics } from "./metrics";

export type TicketView = TicketRecord & {
  customerName: string;
  /** OpenAI trace viewer link for the conversation. */
  traceUrl: string;
  takeover: TakeoverState;
};

/** Everything the left side of the console shows; the page polls this. */
export type AdminState = {
  /** Whether an extra Basic password is configured; public cookie scope applies independently. */
  protected: boolean;
  /** Public visitors manage only conversations whose signed cookies this browser holds. */
  visitorScoped?: boolean;
  consultants: readonly string[];
  tickets: TicketView[];
  approvals: ApprovalRequest[];
  audit: AuditRecord[];
  metrics: Metrics;
  ratingsCount: number;
};

export type RatingView = { rating: "up" | "down"; correction?: string; ratedBy: string };

/** One conversation: transcript, who handles it, and the ratings given to its answers. */
export type ThreadView = {
  threadId: string;
  customerId: string;
  customerName: string;
  traceId: string;
  traceUrl: string;
  takeover: TakeoverState;
  transcript: TranscriptEntry[];
  /** Keyed by transcript entry id. */
  ratings: Record<string, RatingView>;
};

/** Body of POST /api/admin/actions. The route validates it with zod. */
export type AdminAction =
  | { type: "take_over"; consultant: string; threadId: string }
  | { type: "hand_back"; consultant: string; threadId: string }
  | { type: "reply"; consultant: string; threadId: string; text: string }
  | { type: "decide_approval"; consultant: string; approvalId: string; approve: boolean }
  | { type: "rate"; consultant: string; threadId: string; entryId: string; rating: "up" | "down"; correction?: string };

export type ActionResponse = { ok: true } | { ok: false; errorType: string; message: string };
