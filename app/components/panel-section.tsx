"use client";

/**
 * Collapsible section with an icon and a title; every block of the Agent View uses it.
 * ("use client" because it keeps open/closed state with useState.)
 */
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

type Props = { title: string; icon: ReactNode; testId?: string; children: ReactNode; nested?: boolean };
export const sectionHeadingClass = "flex min-h-10 w-full items-center justify-between font-semibold text-zinc-900 hover:text-blue-700";

/** Native details headers and stateful panel sections share one icon/title treatment. */
export function SectionTitle({ title, icon }: Pick<Props, "title" | "icon">) {
  return <span className="flex items-center"><span className="mr-2 rounded-md bg-blue-600/10 p-1.5 shadow-sm">{icon}</span>{title}</span>;
}

export function PanelSection({ title, icon, testId, children, nested = false }: Props) {
  const [open, setOpen] = useState(true);
  const Heading = nested ? "h3" : "h2";
  return (
    <section className="mb-5 last:mb-0" data-testid={testId}>
      <Heading><button type="button" aria-expanded={open}
        className={`mb-3 ${sectionHeadingClass} ${nested ? "text-sm" : "text-base"}`}
        onClick={() => setOpen(!open)}
      >
        <SectionTitle title={title} icon={icon} />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button></Heading>
      {open && children}
    </section>
  );
}
