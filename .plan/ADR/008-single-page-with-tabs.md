# 008 — One page with tabs: Agent, Consultant, How it works

## TLDR

The app is one page. The left workspace has three URL-linked tabs (Agent, Consultant, How it
works); chat stays on the right. The look follows the OpenAI demo. `/admin` redirects to
`/?tab=consultant`.

- **Status:** accepted
- **Date:** 2026-11-09

## Context

Earlier the console lived on a separate `/admin` page. A demo is stronger when the viewer
sees the customer chat and the consultant side together, without switching windows.

## Options considered

1. **Separate `/admin` page.** Clear split, but two windows for a live demo.
2. **One page, tabs in the workspace, chat on the right.**
3. **Three-column layout.** Too dense on small screens.

## Decision

Option 2. Tabs are keyboard-navigable and tracked in the URL (`?tab=`). On small screens the
chat comes first. The scenario menu groups demo cases by concept. Admin APIs keep their auth
and CSRF checks. Visual rules are in [DESIGN.md](../../DESIGN.md).

## Consequences

- The consultant view is reachable by anyone who opens the page; the data stays protected by
  console auth, and without `ADMIN_PASSWORD` the page shows a warning banner.
- The old `/admin` URL still works through a redirect.
- Layout changes need the layout smoke and actual-host screenshots.

## Evidence

- [app/components/workspace.tsx](../../app/components/workspace.tsx),
  [app/app/page.tsx](../../app/app/page.tsx), [app/app/admin/page.tsx](../../app/app/admin/page.tsx).
- Reports: [H03](../handoffs/H03-single-page-tabs-report.md),
  [H04](../handoffs/H04-h03-review-fixes-report.md), [H05](../handoffs/H05-polish-report.md).
- Screenshots: `docs/screenshots/h03-*.png`.
