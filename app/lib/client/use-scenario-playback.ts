"use client";

/** Scenario selection owns one thread; late starts cannot restore a cleared or replaced scenario. */
import { useCallback, useRef, useState } from "react";
import { fillTemplates, type Scenario } from "@/lib/eval/scenarios";
import { handlerOf } from "./selectors";
import { awaitingApprovalAnswer, scenarioProgress, type ScenarioPlayback } from "./scenario-progress";
import type { useSupportSession } from "./use-support-session";

type Session = Pick<ReturnType<typeof useSupportSession>, "startFresh" | "send" | "threadId" | "messages" | "busy" | "events">;

export function useScenarioPlayback(session: Session) {
  const [playback, setPlayback] = useState<ScenarioPlayback>();
  const [opening, setOpening] = useState(false);
  const epoch = useRef(0);
  const clear = useCallback(() => { epoch.current++; setPlayback(undefined); setOpening(false); }, []);
  const run = async (scenario: Scenario) => {
    const selected = ++epoch.current;
    setPlayback(undefined);
    setOpening(true);
    try {
      const threadId = await session.startFresh(scenario.customerId);
      if (selected !== epoch.current) return;
      setPlayback({ threadId, scenario });
      session.send(fillTemplates(scenario.message), { threadId });
    } catch {
      // startFresh already records the typed network failure in the visible event feed.
      if (selected === epoch.current) setPlayback(undefined);
    } finally { if (selected === epoch.current) setOpening(false); }
  };
  const busy = session.busy || opening;
  const waiting = busy || handlerOf(session.events).status === "human" || awaitingApprovalAnswer(session.events, session.messages, session.threadId);
  return { run, clear, busy, scope: `${session.threadId}:${playback?.scenario.id ?? "free"}`,
    ...scenarioProgress(playback, session.threadId, session.messages, waiting) };
}
