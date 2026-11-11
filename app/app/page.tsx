/** Server page: read runtime security configuration without exposing any secret to the client. */
import { SupportDemo } from "@/components/support-demo";
import { usesPublicSessionSecret } from "@/lib/security/thread-credential";
import { VisitorKeyProvider } from "@/components/visitor-key";
import { isPublicDemo } from "@/lib/security/request-key";

// Evaluate at request time: a production build must not freeze the build machine's configuration.
export const dynamic = "force-dynamic";

export default function Home() {
  const publicDemo = isPublicDemo();
  const allowReset = (process.env.ALLOW_DEMO_RESET === "true" && (!publicDemo || !!process.env.ADMIN_PASSWORD)) || (!publicDemo && process.env.NODE_ENV !== "production");
  return <VisitorKeyProvider publicDemo={publicDemo} allowReset={allowReset}>
    <SupportDemo publicSessionSecret={usesPublicSessionSecret()} />
  </VisitorKeyProvider>;
}
