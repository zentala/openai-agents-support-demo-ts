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
import type { MessageReportRecord } from "@/lib/data/store";
import { getThread } from "@/lib/runtime/threads";

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
      category: "Orders",
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

export function reportsToScenarios(reports: MessageReportRecord[]): Scenario[] {
  const scenarios = reports.filter((report) => report.author === "AI assistant").map((report, index): Scenario | undefined => {
    const thread = getThread(report.threadId);
    if (!thread) return undefined;
    return {
      id: `reported-${index + 1}-${report.kind}`,
      label: `${report.kind === "question" ? "Question" : "Reported answer"}: ${report.quote.slice(0, LABEL_LENGTH)}`,
      category: "Human handoff",
      customerId: thread.customerId,
      message: report.kind === "question" ? report.reason : `I think this answer is wrong: ${report.quote}. ${report.reason}`,
      expectedAnswer: report.quote,
      expect: { toolsCalled: [report.kind === "question" ? "ask_a_person" : "report_message"], ticketCreated: true },
    };
  }).filter((scenario): scenario is Scenario => Boolean(scenario));
  return scenarios.map((scenario) => scenarioSchema.parse(scenario));
}
