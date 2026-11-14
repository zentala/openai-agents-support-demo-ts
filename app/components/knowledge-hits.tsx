"use client";

/**
 * "Knowledge Base": what `search_kb` returned for each query, with scores.
 * Handy for showing that a German question finds the English article.
 */
import { Library } from "lucide-react";
import type { KbHit } from "@/lib/types";
import { PanelSection } from "./panel-section";
import { SourceChip } from "./kb-sources";

export function KnowledgeHits({ groups }: { groups: { query: string; hits: KbHit[] }[] }) {
  return (
    <PanelSection title="Knowledge Base" icon={<Library className="h-4 w-4 text-blue-600" />} testId="kb-hits">
      {groups.length === 0 && <p className="text-sm text-zinc-600">No searches yet.</p>}
      <div className="space-y-4">
        {groups.map((group, i) => (
          <section key={i} aria-label={`Search: ${group.query}`} className="space-y-2">
            <p className="wrap-anywhere text-sm text-zinc-600">Search: {group.query}</p>
            {group.hits.length === 0 && <p className="text-sm text-zinc-600">No relevant article.</p>}
            <ul className="space-y-3">{group.hits.map((hit) => (
              <li key={hit.id} data-testid="kb-hit" data-article={hit.id} className="space-y-1">
                <h3 className="wrap-anywhere text-sm font-semibold text-zinc-900">{hit.title}</h3>
                <p className="line-clamp-1 wrap-anywhere text-sm text-zinc-700" title={hit.snippet}>{hit.snippet}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <SourceChip id={hit.id} />
                  <span className="text-xs text-zinc-600">score {hit.score}</span>
                </div>
              </li>
            ))}</ul>
          </section>
        ))}
      </div>
    </PanelSection>
  );
}
