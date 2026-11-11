/**
 * Small pill used for statuses (Active, Passed, Failed, Pending...).
 */
import clsx from "clsx";
import type { HTMLAttributes } from "react";

const TONES = {
  blue: "bg-blue-600 text-white",
  green: "bg-green-100 text-green-900",
  red: "bg-red-100 text-red-900",
  amber: "bg-amber-100 text-amber-900",
  grey: "bg-gray-200 text-gray-700",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "blue", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs", TONES[tone], className)}
      {...props}
    />
  );
}
