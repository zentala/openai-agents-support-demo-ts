/**
 * Retry for the page's start-up calls. Render's free instance sleeps and redeploys; its proxy then
 * answers 502/503/504 with an HTML body, or the connection fails. Those are transient: wait and retry.
 * Our own routes also answer 503 on purpose, with a JSON `{ errorType, message }` body. That is a real
 * answer: it is never retried and never relabelled. Anything else is returned at once.
 */

/** Wait before retry 1, 2 and 3: four tries over about 14 seconds. */
export const RETRY_DELAYS_MS = [2000, 4000, 8000] as const;

const PROXY_STATUSES = new Set([502, 503, 504]);

/** 502/503/504 that did NOT come from our own routes (those answer with a JSON error body). */
export const isProxyFailure = (response: Response): boolean =>
  PROXY_STATUSES.has(response.status) && !(response.headers.get("content-type") ?? "").includes("application/json");

/** The one readable error for "the server is not answering right now". Type stays visible. */
export function serverUnavailableError(cause: { status?: number }): Error {
  const where = cause.status ? ` (HTTP ${cause.status})` : "";
  const error = new Error(`The demo server is starting or redeploying${where}. Try again in a minute.`);
  error.name = "ServerUnavailable";
  return error;
}

const abortError = () => new DOMException("Aborted", "AbortError");

/** Sleeps, but rejects with AbortError as soon as the request is aborted. */
function wait(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const onAbort = () => { clearTimeout(timer); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export type RetryOptions = {
  delays?: readonly number[];
  /**
   * Proxy statuses worth another try. A POST must not retry a status that can arrive after the request
   * reached the origin (504): it could run twice. Such a status throws `ServerUnavailable` at once.
   */
  retryStatuses?: ReadonlySet<number>;
};

/**
 * `fetch` that retries transient failures: a connection failure before any response, or a proxy
 * 502/503/504 page. After the last try it throws `ServerUnavailable`. An aborted request is never
 * retried; its AbortError reaches the caller.
 */
export async function fetchWithRetry(input: string, init?: RequestInit, options: RetryOptions = {}): Promise<Response> {
  const { delays = RETRY_DELAYS_MS, retryStatuses = PROXY_STATUSES } = options;
  for (let attempt = 0; ; attempt++) {
    let status: number | undefined;
    try {
      const response = await fetch(input, init);
      if (!isProxyFailure(response)) return response;
      status = response.status;
      if (!retryStatuses.has(status)) throw serverUnavailableError({ status });
    } catch (error) {
      if (init?.signal?.aborted || (error as Error).name === "AbortError") throw abortError();
      if ((error as Error).name === "ServerUnavailable") throw error;
    }
    if (attempt >= delays.length) {
      if (init?.signal?.aborted) throw abortError();
      throw serverUnavailableError({ status });
    }
    await wait(delays[attempt], init?.signal);
  }
}
