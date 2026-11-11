"use client";

/** Opt-in visual feedback: Next loads Agentation's separate chunk only when the switch is on. */
import dynamic from "next/dynamic";
import { useEffect } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Settings } from "lucide-react";
import { rememberAnnotationAccess, setAnnotationsEnabled, useAnnotations } from "@/lib/client/annotations";

// No endpoint: feedback stays in the browser until the developer copies it manually.
const Toolbar = dynamic(() => import("agentation").then((module) => module.Agentation), { ssr: false });

export function AnnotationRoot() {
  const state = useAnnotations();
  useEffect(rememberAnnotationAccess, []);
  if (state.startsWith("error:")) return <p role="alert" className="fixed bottom-3 right-3 z-50 max-w-sm rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">AnnotationStorageError: {state.slice(6)}</p>;
  return state === "on" ? <div data-testid="annotation-toolbar"><Toolbar /></div> : null;
}

export function AnnotationSettings() {
  const state = useAnnotations();
  if (state !== "on" && state !== "off") return null;
  return <Menu.Root>
    <Menu.Trigger aria-label="Settings" title="Settings" data-testid="annotation-settings" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-white/10">
      <Settings aria-hidden="true" className="h-4 w-4" />
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Content align="end" sideOffset={8} collisionPadding={12} className="z-50 w-64 rounded-lg border border-gray-200 bg-white p-3 text-sm text-zinc-900 shadow-xl shadow-gray-400/40">
        <Menu.Label className="mb-2 font-semibold">Settings</Menu.Label>
        <Menu.Item asChild onSelect={(event) => event.preventDefault()}>
          <button role="switch" aria-checked={state === "on"} data-testid="annotations-switch" onClick={() => setAnnotationsEnabled(state !== "on")} className="flex h-10 w-full items-center justify-between rounded-md px-2 hover:bg-gray-100">
            Annotations <span className={`rounded-full px-2 py-0.5 text-xs ${state === "on" ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-zinc-700"}`}>{state === "on" ? "On" : "Off"}</span>
          </button>
        </Menu.Item>
        <p className="mt-2 text-xs text-zinc-600">Copy feedback from the toolbar and paste it into your coding agent.</p>
      </Menu.Content>
    </Menu.Portal>
  </Menu.Root>;
}
