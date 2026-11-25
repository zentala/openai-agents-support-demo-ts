"use client";

/**
 * Thumbs up/down under one agent answer, with an optional correction ("a good answer would say...").
 * A saved rating shows who gave it. The export button turns all ratings into eval scenarios.
 */
import { Icon } from "@/components/icon";
import { useState } from "react";
import type { RatingView } from "@/lib/admin/types";

type Props = {
  rated?: RatingView;
  disabled: boolean;
  onRate: (rating: "up" | "down", correction: string) => void;
};

const iconButton = "flex h-10 w-10 shrink-0 items-center justify-center rounded-md p-1 hover:bg-gray-200 disabled:opacity-50";

export function RatingControls({ rated, disabled, onRate }: Props) {
  const [correction, setCorrection] = useState("");
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 sm:flex-nowrap" data-testid="rating-controls" data-rating={rated?.rating ?? "none"}>
      <button
        aria-label="Rate answer good"
        data-testid="rate-up"
        aria-pressed={rated?.rating === "up"}
        disabled={disabled}
        className={`${iconButton} ${rated?.rating === "up" ? "bg-emerald-100 text-emerald-700" : "text-zinc-600"}`}
        onClick={() => onRate("up", correction)}
      >
        <Icon name="like" className="h-4 w-4" />
      </button>
      <button
        aria-label="Rate answer bad"
        data-testid="rate-down"
        aria-pressed={rated?.rating === "down"}
        disabled={disabled}
        className={`${iconButton} ${rated?.rating === "down" ? "bg-red-100 text-red-700" : "text-zinc-600"}`}
        onClick={() => onRate("down", correction)}
      >
        <Icon name="dislike" className="h-4 w-4" />
      </button>
      <input
        aria-label="Correction (optional)"
        data-testid="rating-correction"
        value={correction}
        onChange={(e) => setCorrection(e.target.value)}
        placeholder="Correction (optional)"
        className="order-last h-10 min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-0 rounded-none border-0 border-b border-zinc-900/20 bg-transparent px-2 py-1 text-sm placeholder:text-gray-400 focus-visible:border-zinc-900/40 focus-visible:outline-none focus-visible:ring-0"
      />
      {rated && <span className="text-xs text-zinc-600">rated {rated.rating} by {rated.ratedBy}</span>}
    </div>
  );
}
