"use client";

/**
 * Public KB articles shared by chat citations and inspector hits.
 * Native dialog supplies modal focus containment, Escape and focus restoration.
 * SECURITY: article bodies and model text are React text, never HTML or model-provided URLs.
 */
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { KbArticle } from "@/lib/types";
import { BookOpen } from "lucide-react";

const Sources = createContext<{ articles: KbArticle[]; open: (article: KbArticle) => void }>({ articles: [], open: () => {} });

export function KbSourcesProvider({ articles, children }: { articles: KbArticle[]; children?: ReactNode }) {
  const [selected, setSelected] = useState<KbArticle>();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    // showModal puts the native dialog in the top layer, above both scrolling panels.
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);
  return <Sources.Provider value={{ articles, open: setSelected }}>
    {children}
    <dialog ref={dialog} aria-labelledby={titleId} onClose={() => setSelected(undefined)}
      data-testid="kb-article-dialog"
      className="m-auto max-h-[80svh] w-11/12 max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 text-zinc-900 shadow-sm backdrop:bg-gray-900/40">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 id={titleId} className="text-lg font-semibold">{selected?.title}</h2>
        <button type="button" onClick={() => dialog.current?.close()}
          className="h-10 shrink-0 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium hover:bg-gray-100">Close</button>
      </div>
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{selected?.body}</div>
    </dialog>
  </Sources.Provider>;
}

/** A known repository source opens locally. Unknown IDs remain inert text. */
export function SourceChip({ id }: { id: string }) {
  const sources = useContext(Sources);
  const article = sources.articles.find((entry) => entry.id === id);
  if (!article) return <>{`[${id}]`}</>;
  return <button type="button" data-testid="source-chip" data-article={id}
    aria-haspopup="dialog" aria-label={`Read source: ${article.title}`} onClick={() => sources.open(article)}
    className="inline-flex min-h-8 max-w-full items-center gap-1 whitespace-normal rounded-full border border-gray-300 bg-gray-100 px-2 text-left align-middle text-sm font-medium text-blue-700 hover:bg-blue-50">
    <BookOpen aria-hidden="true" className="size-3.5 shrink-0" />{article.title}
  </button>;
}

/** Recognize only bracketed repository IDs; preserve all other model output as escaped text. */
export function CitationText({ text }: { text: string }) {
  const { articles } = useContext(Sources);
  return <>{text.split(/(\[[a-z0-9-]+\])/g).map((part, index) => {
    const id = part.startsWith("[") ? part.slice(1, -1) : undefined;
    return id && articles.some((article) => article.id === id) ? <SourceChip key={index} id={id} /> : part;
  })}</>;
}
