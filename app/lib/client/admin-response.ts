/** Proxy 401 responses are plain text, before the route can return JSON. */
export async function adminResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) throw new Error("AdminPasswordRequired");
  const body = await response.json() as T & { errorType?: string; message?: string };
  if (!response.ok) throw new Error(`${body.errorType ?? response.status}: ${body.message ?? response.statusText}`);
  return body;
}
