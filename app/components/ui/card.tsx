/**
 * Minimal card primitives (same look as the OpenAI demo's shadcn cards).
 */
import clsx from "clsx";
import type { HTMLAttributes } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, ...props }: DivProps) => (
  <div className={clsx("rounded-lg border border-gray-200 bg-white text-zinc-900 shadow-sm", className)} {...props} />
);

export const CardHeader = ({ className, ...props }: DivProps) => (
  <div className={clsx("flex flex-col space-y-1.5 p-3 pb-1", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: DivProps) => (
  <div className={clsx("text-sm font-semibold leading-none tracking-tight", className)} {...props} />
);

export const CardContent = ({ className, ...props }: DivProps) => (
  <div className={clsx("p-3 pt-1", className)} {...props} />
);
