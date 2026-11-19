"use client";

/**
 * Shown at the top of the Agent View when the inspector feed was refused. The feed lives under /api/admin,
 * so with ADMIN_PASSWORD set the browser must have signed in to the consultant console first.
 */
export function InspectorNotice() {
  return (
    <p data-testid="inspector-refused" className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      The Agent View feed was refused: it is protected like the consultant console. Open the{" "}
      <a href="/admin" target="_blank" rel="noreferrer" className="underline">Consultant console</a>, sign in, then reload this page.
    </p>
  );
}
