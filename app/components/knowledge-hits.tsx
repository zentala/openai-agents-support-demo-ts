"use client";

/**
 * "Knowledge Base": what `search_kb` returned for each query, with scores.
 * Handy for showing that a German question finds the English article.
 */
import { Library } from "lucide-react";
import type { KbHit } from "@/lib/types";
import { PanelSection } from "./panel-section";
import { Card, CardContent } from "./ui/card";

export function KnowledgeHits({ groups }: { groups: { query: string; hits: KbHit[] }[] }) {
  return (
    <PanelSection title="Knowledge Base" icon={<Library className="h-4 w-4 text-blue-600" />} testId="kb-hits">
      {groups.length === 0 && <p className="text-sm text-zinc-600">No searches yet.</p>}
      <div className="space-y-2">
        {groups.map((group, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <p className="mb-1 text-xs text-zinc-600">query: <span className="font-mono text-zinc-800">{group.query}</span></p>
              {group.hits.length === 0 && <p className="text-xs italic text-zinc-600">no relevant article</p>}
              {group.hits.map((hit) => (
                <div key={hit.id} data-testid="kb-hit" data-article={hit.id} className="mt-1 text-xs">
                  <span className="font-mono font-semibold text-blue-700">{hit.id}</span>{" "}
                  <span className="text-zinc-600">score {hit.score}</span>
                  <p className="line-clamp-2 text-zinc-700">{hit.snippet}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </PanelSection>
  );
}
