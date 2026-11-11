/** Standing demo caveat: a neutral notice keeps amber for immediate human decisions. */
import { ShieldAlert } from "lucide-react";

export function SessionSecretNotice() {
  return (
    <div role="status" data-testid="public-session-secret" className="mb-4 flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-zinc-700">
      <ShieldAlert aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
      <p>Demo security: SESSION_SECRET uses the public default. Anyone can forge conversation cookies. Set a private secret before sharing this app.</p>
    </div>
  );
}
