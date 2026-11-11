/**
 * Agents SDK: agents, handoffs and guardrails wired together.
 *
 * Concepts shown here:
 * - `Agent`: instructions + tools + model. Instructions can be a FUNCTION of the
 *   run context, so the prompt can include facts from the session.
 * - `handoffs`: the triage agent can transfer the conversation to a specialist.
 *   The SDK turns each handoff into a tool named `transfer_to_<agent>`.
 * - `inputGuardrails` only on the entry agent; `outputGuardrails` on every agent
 *   that can produce a final answer.
 * - Least privilege: the FAQ agent has NO refund tool at all.
 */
import { Agent, handoff, type RunContext } from "@openai/agents";
import { AGENT_MODEL, modelSettingsFor } from "@/lib/config";
import { jailbreakGuardrail, relevanceGuardrail } from "@/lib/guardrails/input-guardrails";
import { leakGuardrail } from "@/lib/guardrails/leak-guardrail";
import { getOrder, listMyOrders } from "@/lib/tools/orders";
import { showOrderPicker } from "@/lib/tools/order-picker";
import { updateAddressChange } from "@/lib/tools/address";
import { requestClaimPhoto, submitClaim, updateClaim } from "@/lib/tools/claim";
import { createRefund } from "@/lib/tools/refund";
import { requestBankAccount, requestCallbackPhone } from "@/lib/tools/secure-forms";
import { verifyCustomer } from "@/lib/tools/verify-customer";
import { escalateToHuman, searchKbTool } from "@/lib/tools/kb-and-escalation";
import type { SupportContext } from "@/lib/types";
import { FAQ, ORDERS, TRIAGE } from "./catalog";
import { applyHandoffInput, faqHandoffInput, ordersHandoffInput } from "./handoff-context";
import { buildInstructions, FAQ_ROLE, ORDERS_ROLE, TRIAGE_ROLE } from "./prompts";

const instructionsFor = (role: string) => (runContext: RunContext<SupportContext>) =>
  buildInstructions(role, runContext.context);

const common = {
  model: AGENT_MODEL,
  modelSettings: modelSettingsFor(AGENT_MODEL),
  outputGuardrails: [leakGuardrail],
};

// INTERVIEW: least privilege - the FAQ agent has no order or refund tools, so even a hijacked FAQ agent cannot move money.
const faqAgent = new Agent<SupportContext>({
  ...common,
  name: FAQ,
  handoffDescription: "Policy questions: returns rules, delivery, warranty, payments, assembly.",
  instructions: instructionsFor(FAQ_ROLE),
  tools: [searchKbTool, escalateToHuman],
});

const ordersAgent = new Agent<SupportContext>({
  ...common,
  name: ORDERS,
  handoffDescription: "The customer's own orders, delivery status, returns and refunds.",
  instructions: instructionsFor(ORDERS_ROLE),
  tools: [getOrder, listMyOrders, showOrderPicker, createRefund, updateClaim, requestClaimPhoto, submitClaim, updateAddressChange, requestBankAccount, requestCallbackPhone, verifyCustomer, escalateToHuman],
});

// INTERVIEW: `handoff()` instead of a bare agent = a hook. The model passes a reason (and an order
// number); our onHandoff code validates it and writes it into the run context before the specialist starts.
const toFaq = handoff(faqAgent, {
  inputType: faqHandoffInput,
  onHandoff: (runContext, input) => applyHandoffInput(runContext.context as SupportContext, input),
});
const toOrders = handoff(ordersAgent, {
  inputType: ordersHandoffInput,
  onHandoff: (runContext, input) => applyHandoffInput(runContext.context as SupportContext, input),
});

// `handoffs` lists the agents this one may transfer the conversation to.
export const triageAgent = new Agent<SupportContext, "text">({
  ...common,
  name: TRIAGE,
  instructions: instructionsFor(TRIAGE_ROLE),
  tools: [escalateToHuman],
  handoffs: [toFaq, toOrders],
  inputGuardrails: [jailbreakGuardrail, relevanceGuardrail],
});
