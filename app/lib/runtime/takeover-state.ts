/**
 * Takeover state machine as a PURE reducer (no I/O, easy to unit-test).
 *
 *   agent --take(consultant)--> human --release(owner)--> agent
 *                               human --reply(owner)----> human
 *
 * While the state is `human`, customer messages go to the consultant and the agent does not answer.
 * SECURITY: only the consultant who took the conversation may reply or hand it back, so two
 * consultants cannot talk over each other and a hand-back cannot come from someone else.
 */
export type TakeoverState = { status: "agent" } | { status: "human"; consultant: string; since: number };

export type TakeoverAction =
  | { type: "take"; consultant: string; at: number }
  | { type: "release"; consultant: string }
  | { type: "reply"; consultant: string };

export type TakeoverResult = { ok: true; state: TakeoverState } | { ok: false; errorType: string; message: string };

export const initialTakeover = (): TakeoverState => ({ status: "agent" });

const refuse = (errorType: string, message: string): TakeoverResult => ({ ok: false, errorType, message });

export function reduceTakeover(state: TakeoverState, action: TakeoverAction): TakeoverResult {
  if (action.type === "take") {
    if (state.status === "agent") return { ok: true, state: { status: "human", consultant: action.consultant, since: action.at } };
    const who = state.consultant === action.consultant ? "you" : state.consultant;
    return refuse("AlreadyTakenOver", `This conversation is already handled by ${who}.`);
  }
  if (state.status === "agent") {
    return refuse("NotTakenOver", "Take the conversation over first: the agent is still answering.");
  }
  if (state.consultant !== action.consultant) {
    return refuse("NotYourConversation", `This conversation is handled by ${state.consultant}, not by ${action.consultant}.`);
  }
  return { ok: true, state: action.type === "release" ? initialTakeover() : state };
}
