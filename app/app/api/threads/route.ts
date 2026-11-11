/**
 * Creates a conversation thread and issues its credential.
 *
 * The browser asks "start a conversation as <customer>" (the simulated login: a dropdown, or "guest").
 * The SERVER makes the thread id, stores the customer with the thread, and answers with a signed httpOnly
 * cookie. From now on chat, streams, uploads and forms are authorized by that cookie, not by an id the
 * browser could guess or copy.
 *
 * SECURITY: a real product would also rate-limit thread creation per IP and tie it to a login session.
 */
import { z } from "zod";
import { publicRateLimit } from "@/lib/security/public-rate-limit";
import { getCustomer } from "@/lib/data/store";
import { createThread, ThreadCapacityError } from "@/lib/runtime/threads";
import { credentialSetCookie, usesPublicSessionSecret } from "@/lib/security/thread-credential";
import { isPublicDemo } from "@/lib/security/request-key";
import { GUEST_ID } from "@/lib/types";

const bodySchema = z.object({ customerId: z.string().max(40) });

export async function POST(req: Request) {
  if (isPublicDemo() && usesPublicSessionSecret()) {
    return Response.json({ errorType: "SessionSecretRequired", message: "Configure a private SESSION_SECRET before using public mode." }, { status: 503 });
  }
  const limited = publicRateLimit(req, "threads");
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ errorType: "InvalidRequest", message: "Body must be { customerId }" }, { status: 400 });
  }
  const { customerId } = parsed.data;
  if (customerId !== GUEST_ID && !getCustomer(customerId)) {
    return Response.json({ errorType: "UnknownCustomer", message: `No customer with id "${customerId}"` }, { status: 400 });
  }
  let thread;
  try {
    thread = createThread(customerId);
  } catch (error) {
    if (!(error instanceof ThreadCapacityError)) throw error;
    return Response.json({ errorType: error.name, message: error.message }, { status: 429 });
  }
  // Behind Caddy the browser talks https while this server sees http: trust the forwarded protocol.
  const secure = (req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "")) === "https";
  return Response.json(
    { threadId: thread.threadId },
    { status: 201, headers: { "Set-Cookie": credentialSetCookie(thread.threadId, secure) } },
  );
}
