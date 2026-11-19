/** Customer-visible authorship. Code supplies these labels; model prose never determines its author. */
export type SenderInfo = {
  kind: "ai" | "human" | "system";
  name?: string;
  title?: string;
  ticketId?: string;
  /** Join/leave notices use a thin line instead of an automatic-step receipt. */
  notice?: boolean;
};
export type CustomerMessage = { text: string; sender: SenderInfo };

export const automaticStep = (title: string, ticketId?: string): SenderInfo => ({ kind: "system", title, ...(ticketId ? { ticketId } : {}) });

/** Legacy role is storage/rating compatibility, not the visible author kind. */
export function senderForRole(role: string, name?: string): SenderInfo {
  return role === "agent" ? { kind: "ai" } : role === "system" ? { kind: "system", notice: true }
    : { kind: "human", ...(name ? { name } : {}) };
}
