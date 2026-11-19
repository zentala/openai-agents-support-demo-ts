/**
 * Static description of the agents for the Agent View panel.
 * No SDK imports, so the browser bundle can use it. The real agents are in
 * ./index.ts and use the same names, which is how the UI matches events to cards.
 */
export const TRIAGE = "Triage Agent";
export const FAQ = "FAQ Agent";
export const ORDERS = "Orders & Refunds Agent";

export type AgentInfo = {
  name: string;
  description: string;
  handoffs: string[];
  inputGuardrails: string[];
  tools: string[];
};

export const AGENT_CATALOG: AgentInfo[] = [
  {
    name: TRIAGE,
    description: "Entry point. Runs the input guardrails and routes to a specialist.",
    handoffs: [FAQ, ORDERS],
    inputGuardrails: ["jailbreak_guardrail", "relevance_guardrail"],
    tools: ["escalate_to_human"],
  },
  {
    name: FAQ,
    description: "Answers policy questions from the knowledge base and cites sources.",
    handoffs: [],
    inputGuardrails: [],
    tools: ["search_kb", "escalate_to_human"],
  },
  {
    name: ORDERS,
    description: "Looks up the customer's orders and creates refunds within policy.",
    handoffs: [],
    inputGuardrails: [],
    tools: ["get_order", "list_my_orders", "show_order_picker", "create_refund", "update_claim", "request_claim_photo", "submit_claim", "update_address_change", "request_bank_account", "request_callback_phone", "verify_customer", "escalate_to_human"],
  },
];

export const GUARDRAIL_INFO: Record<string, { label: string; description: string }> = {
  jailbreak_guardrail: {
    label: "Jailbreak Guardrail",
    description: "Detects attempts to override or reveal the instructions.",
  },
  relevance_guardrail: {
    label: "Relevance Guardrail",
    description: "Keeps the conversation about Nordic Home support.",
  },
  leak_guardrail: {
    label: "Leak Guardrail (output)",
    description: "Blocks answers with prompt text, other customers' data or card numbers.",
  },
};
