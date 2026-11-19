/** Proxy 401 responses are plain text, before the route can return JSON. */
import type { ActionResponse } from "@/lib/admin/types";
export async function adminResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) throw new Error("AdminPasswordRequired");
  const body = await response.json() as T & { errorType?: string; message?: string };
  if (!response.ok) throw new Error(`${body.errorType ?? response.status}: ${body.message ?? response.statusText}`);
  return body;
}

/** Tone warnings are a recoverable composer state; other HTTP errors keep their normal notice. */
export async function adminActionResponse(response: Response): Promise<ActionResponse> {
  if (response.status === 409) {
    const body = await response.clone().json().catch(() => null);
    if (body?.ok === false && body.errorType === "StaffToneWarning" && typeof body.warningId === "string" && typeof body.message === "string") return body;
  }
  return adminResponse<ActionResponse>(response);
}
