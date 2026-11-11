/** Keep old bookmarks useful. Admin API authentication and CSRF remain in proxy.ts. */
import { redirect } from "next/navigation";

export default function AdminPage() {
  // Next sends an HTTP redirect; there is only one consultant UI to maintain.
  redirect("/?tab=consultant");
}
