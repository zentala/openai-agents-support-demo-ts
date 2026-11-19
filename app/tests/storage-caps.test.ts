/** Global storage bounds, including both thread entry points and racing photo uploads. */
import { beforeEach, describe, expect, it } from "vitest";
import { addPhoto, listPhotos, MAX_PHOTOS_TOTAL, resetDemoData } from "@/lib/data/store";
import { createThread, getThread, listThreads, MAX_THREADS, threadFor } from "@/lib/runtime/threads";
import { clearVault, getSecret, MAX_VAULT_ENTRIES, storeSecret } from "@/lib/sensitive/vault";
import { credentialSetCookie } from "@/lib/security/thread-credential";
import { POST as uploadPhoto } from "@/app/api/threads/[threadId]/photo/route";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const photo = { threadId: "synthetic-fill", bytes: Buffer.from(PNG), mimeType: "image/png", fileName: "test.png" };

beforeEach(() => {
  resetDemoData();
  clearVault();
});

describe("global storage caps", () => {
  it("evicts the oldest created conversation through either registry entry point", () => {
    const oldest = createThread("c-james");
    const next = createThread("c-james");
    // Reading an old thread must not turn creation order into last-access order.
    expect(threadFor(oldest)).toBe(oldest);
    for (let i = 0; i < MAX_THREADS - 2; i++) createThread("c-james");
    expect(getThread(oldest.threadId)).toBe(oldest);
    const newest = threadFor({ customerId: "c-james", threadId: crypto.randomUUID() })!;
    expect(getThread(oldest.threadId)).toBeUndefined();
    expect(getThread(next.threadId)).toBe(next);
    expect(getThread(newest.threadId)).toBe(newest);
    expect(listThreads()).toHaveLength(MAX_THREADS);
  });

  it("caps photos at insertion and keeps already stored bytes", () => {
    for (let i = 0; i < MAX_PHOTOS_TOTAL; i++) expect(addPhoto(photo)).toBeDefined();
    const first = listPhotos()[0];
    expect(addPhoto(photo)).toBeUndefined();
    expect(listPhotos()).toHaveLength(MAX_PHOTOS_TOTAL);
    expect(listPhotos()[0]).toBe(first);
  });

  it("refuses a new vault entry at capacity, but still permits updating an existing one", () => {
    for (let i = 0; i < MAX_VAULT_ENTRIES; i++) expect(storeSecret(`thread-${i}`, "phone", "+48123456789").ok).toBe(true);
    expect(storeSecret("overflow", "phone", "+48123456789")).toMatchObject({ ok: false, errorType: "VaultFull" });
    expect(getSecret("overflow", "phone")).toBeUndefined();
    expect(storeSecret("thread-0", "phone", "+48987654321").ok).toBe(true);
    expect(getSecret("thread-0", "phone")).toBe("+48987654321");
    clearVault();
    expect(storeSecret("overflow", "phone", "+48123456789").ok).toBe(true);
  });
});

/** Real multipart route call; only the tiny image fixture is synthetic. */
async function upload(threadId: string): Promise<Response> {
  const form = new FormData();
  form.append("photo", new File([PNG], "test.png", { type: "image/png" }));
  const encoded = new Request("http://demo.local/photo", { method: "POST", body: form });
  const bytes = await encoded.arrayBuffer();
  return uploadPhoto(new Request("http://demo.local/photo", {
    method: "POST",
    headers: {
      cookie: credentialSetCookie(threadId, false).split(";")[0],
      "content-type": encoded.headers.get("content-type")!,
      "content-length": String(bytes.byteLength),
    },
    body: bytes,
  }), { params: Promise.resolve({ threadId }) });
}

it("two uploads racing for the final slot return one success and one visible capacity error", async () => {
  for (let i = 0; i < MAX_PHOTOS_TOTAL - 1; i++) addPhoto(photo);
  const thread = createThread("c-lena");
  thread.memory.claimDraft = { orderId: "2002" };
  const responses = await Promise.all([upload(thread.threadId), upload(thread.threadId)]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 429]);
  expect(await responses.find((r) => r.status === 429)!.json()).toMatchObject({ errorType: "PhotoStorageFull" });
  expect(listPhotos()).toHaveLength(MAX_PHOTOS_TOTAL);
});
