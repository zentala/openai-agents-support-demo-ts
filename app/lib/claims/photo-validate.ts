/**
 * Validation of an uploaded damage photo, pure.
 *
 * SECURITY: never trust what the upload SAYS it is. The browser-sent `Content-Type` and the file name are
 * attacker-controlled, so we check the size, then look at the file's first bytes ("magic numbers") and accept
 * the file only when they match an allowed image format. The stored type is the one we detected.
 * The file is kept in memory and never executed, never served back inline, never given to the model.
 */

/** 2 MB: a phone photo after compression; the limit also bounds server memory per upload. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoType = (typeof ACCEPTED_PHOTO_TYPES)[number];

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean => signature.every((byte, i) => bytes[offset + i] === byte);

/** Detects the real format from the first bytes, or undefined when it is not an allowed image. */
export function detectPhotoType(bytes: Uint8Array): PhotoType | undefined {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // WebP is a RIFF container: "RIFF" .... "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return undefined;
}

export type PhotoCheck = { ok: true; type: PhotoType } | { ok: false; errorType: string; message: string };

export function checkPhoto(bytes: Uint8Array, declaredType: string): PhotoCheck {
  if (bytes.byteLength === 0) return { ok: false, errorType: "EmptyFile", message: "The file is empty." };
  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    return { ok: false, errorType: "FileTooLarge", message: `The file is ${Math.round(bytes.byteLength / 1024)} KB; the limit is ${MAX_PHOTO_BYTES / 1024} KB.` };
  }
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(declaredType)) {
    return { ok: false, errorType: "UnsupportedType", message: `File type "${declaredType || "unknown"}" is not accepted. Use JPEG, PNG or WebP.` };
  }
  const detected = detectPhotoType(bytes);
  if (!detected) return { ok: false, errorType: "NotAnImage", message: "The file content is not a JPEG, PNG or WebP image (it only claims to be)." };
  return { ok: true, type: detected };
}
