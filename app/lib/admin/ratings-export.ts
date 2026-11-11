/**
 * Ratings -> eval scenarios. Pure: rating records in, the shape of data/scenarios.json out.
 *
 * Idea (INTERVIEW: "production feedback becomes regression tests"): a consultant rates an agent
 * answer; the export turns each rating into a scenario that `just eval` can replay. Thumbs-up pins what
 * was good (same tools, non-empty answer); thumbs-down pins that this answer must not come back, and
 * keeps the consultant's correction as `expectedAnswer` for a human or LLM judge to read.
 */
import type { RatingRecord } from "@/lib/data/store";
import { scenarioSchema, type Expectation, type Scenario } from "@/lib/eval/scenarios";

const LABEL_LENGTH = 40;
/** How much of a rejected answer is turned into a "must not match" pattern. */
const BAD_ANSWER_PREFIX = 80;

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function expectationFor(rating: RatingRecord): Expectation {
  if (rating.rating === "down") {
    return { replyNotMatches: [escapeRegExp(rating.agentReply.replace(/\s+/g, " ").slice(0, BAD_ANSWER_PREFIX))] };
  }
  const tools = [...new Set(rating.tools)];
  // "^\s*$" matching would mean an empty answer, so forbidding it asserts "answered something".
  return { ...(tools.length > 0 ? { toolsCalled: tools } : {}), replyNotMatches: ["^\\s*$"] };
}

export function ratingsToScenarios(ratings: RatingRecord[]): Scenario[] {
  const scenarios = ratings.map((rating, index): Scenario => {
    const [first = "", ...followUps] = rating.userTurns;
    return {
      id: `rated-${index + 1}-${rating.rating}`,
      label: `Rated ${rating.rating}: ${first.slice(0, LABEL_LENGTH)}`,
      category: "Basics",
      customerId: rating.customerId,
      message: first,
      ...(followUps.length > 0 ? { followUps } : {}),
      ...(rating.correction ? { expectedAnswer: rating.correction } : {}),
      expect: expectationFor(rating),
    };
  });
  // Validate with the same schema as the scenarios file, so an export can always be pasted into it.
  return scenarios.map((s) => scenarioSchema.parse(s));
}
