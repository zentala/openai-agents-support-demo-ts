"use client";

/** Staff-only customer reports and answer questions, with the server-quoted answer. */
import type { MessageReportRecord } from "@/lib/data/store";
import { PanelSection } from "../panel-section";
import { Icon } from "@/components/icon";
import { formatTime } from "@/lib/client/format-time";

export function Reports({ reports }: { reports: MessageReportRecord[] }) {
  return <PanelSection title={`Reports (${reports.length})`} icon={<Icon name="flag" className="h-4 w-4 text-blue-600" />} testId="reports-section">
    {reports.length === 0 ? <p className="text-sm text-zinc-600">No message reports yet.</p> : <div className="space-y-2">{reports.map((report) => <article key={report.id} className="rounded-md border border-gray-200 bg-white p-3 text-sm">
      <p className="font-medium">{report.kind === "question" ? "Ask a person" : "Reported message"} · {report.author}</p>
      <blockquote className="my-2 border-l-2 border-gray-300 pl-2 text-zinc-700">{report.quote}</blockquote>
      <p>{report.kind === "question" ? "Question" : "Reason"}: {report.reason}</p>
      <p className="mt-1 text-xs text-zinc-600">Thread {report.threadId.slice(0, 8)} · {formatTime(report.createdAt, true)}</p>
    </article>)}</div>}
  </PanelSection>;
}
