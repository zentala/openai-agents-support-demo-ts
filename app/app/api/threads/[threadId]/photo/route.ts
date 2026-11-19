/**
 * Damage photo upload for the claim in progress (multipart form data, field name "photo").
 *
 * Checks, in order: thread credential cookie -> customer is verified -> upload size announced by the
 * request -> a claim with an order is in progress -> photo limit per conversation -> size, declared type and
 * the file's real format (lib/claims/photo-validate.ts). The photo is kept in memory and its id is written
 * into the claim draft; the model is only told "a photo is attached", never given the bytes.
 *
 * SECURITY: the body is refused BEFORE it is read when the announced size is over the limit, so a huge upload
 * cannot fill server memory. A real product streams to object storage with a virus scan.
 */
import { addPhoto, listPhotos, MAX_PHOTOS_TOTAL } from "@/lib/data/store";
import { publishClaimSlots } from "@/lib/claims/claim-draft";
import { checkPhoto, MAX_PHOTO_BYTES } from "@/lib/claims/photo-validate";
import { authorizeThread } from "@/lib/security/thread-access";
import { publicRateLimit } from "@/lib/security/public-rate-limit";
import { GUEST_ID } from "@/lib/types";

/** Room for the multipart boundaries and headers around the file. */
const MULTIPART_OVERHEAD_BYTES = 8 * 1024;
const MAX_PHOTOS_PER_THREAD = 3;
const MAX_FILE_NAME = 80;

const refuse = (status: number, errorType: string, message: string) => Response.json({ ok: false, errorType, message }, { status });

/** Keeps only the last path segment and harmless characters: the name is shown back to the customer, never used as a path. */
const safeFileName = (name: string): string => name.split(/[\\/]/).pop()!.replace(/[^\w.\- ]/g, "_").slice(0, MAX_FILE_NAME) || "photo";

export async function POST(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const access = authorizeThread(req, threadId);
  if (!access.ok) return access.response;
  const limited = publicRateLimit(req, "photo", threadId);
  if (limited) return limited;
  const { thread } = access;
  if (thread.customerId === GUEST_ID) return refuse(403, "NotVerified", "Please verify your identity in the chat first.");

  const announced = Number(req.headers.get("content-length"));
  if (!Number.isFinite(announced) || announced <= 0) return refuse(411, "LengthRequired", "The upload must announce its size.");
  if (announced > MAX_PHOTO_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return refuse(413, "FileTooLarge", `The upload is ${Math.round(announced / 1024)} KB; the limit is ${MAX_PHOTO_BYTES / 1024} KB.`);
  }
  const draft = thread.memory.claimDraft;
  if (!draft?.orderId) return refuse(409, "NoClaimInProgress", "Report the damaged item in the chat first; the photo belongs to that claim.");
  if (listPhotos().filter((p) => p.threadId === threadId).length >= MAX_PHOTOS_PER_THREAD) {
    return refuse(429, "TooManyPhotos", `At most ${MAX_PHOTOS_PER_THREAD} photos per conversation.`);
  }
  if (listPhotos().length >= MAX_PHOTOS_TOTAL) return refuse(429, "PhotoStorageFull", "Demo photo storage is full. Contact a consultant.");

  const file = (await req.formData().catch(() => null))?.get("photo");
  if (!(file instanceof File)) return refuse(400, "InvalidRequest", "Send the image as multipart form data in the field 'photo'.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = checkPhoto(bytes, file.type);
  if (!checked.ok) return refuse(422, checked.errorType, checked.message);

  const photo = addPhoto({ threadId, mimeType: checked.type, bytes: Buffer.from(bytes), fileName: safeFileName(file.name) });
  if (!photo) return refuse(429, "PhotoStorageFull", "Demo photo storage is full. Contact a consultant.");
  thread.memory = { ...thread.memory, claimDraft: { ...draft, photoId: photo.id } };
  publishClaimSlots(threadId, thread.memory.claimDraft ?? {});
  return Response.json({ ok: true, photoId: photo.id });
}
