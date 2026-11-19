/** Both panels must explain ticket ownership without implying that escalation disables the agent. */
import { expect, it } from "vitest";
import { handlerDescription } from "@/lib/client/handler-description";
import { openTicketOf } from "@/lib/client/selectors";
import type { AgentEvent } from "@/lib/types";
it("describes agent, open ticket and takeover accurately", () => {
  expect(handlerDescription("agent")).toBe("The agent answers the customer.");
  expect(handlerDescription("agent", undefined, "T-2001")).toBe("Ticket T-2001 open — the agent keeps answering until a consultant takes over");
  expect(handlerDescription("human", "Marta", "T-2001")).toBe("Handled by Marta");
});
it("stops describing a ticket as open after hand-back", () => {
  const events = [{ kind: "escalation", ticketId: "T-2001" }] as AgentEvent[];
  expect(openTicketOf(events)).toBe("T-2001");
  events.push({ kind: "takeover", status: "agent" } as AgentEvent);
  expect(openTicketOf(events)).toBeUndefined();
});
