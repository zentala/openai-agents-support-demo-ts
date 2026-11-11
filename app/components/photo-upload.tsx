"use client";

/**
 * Photo upload widget for a damage claim (optional step). The file goes to our server
 * (POST /api/threads/<id>/photo as multipart form data), never through the model. The browser checks size and
 * type only to answer fast; the SERVER checks them again and also looks at the file's first bytes.
 */
import { Camera } from "lucide-react";
import { useState } from "react";
import type { PhotoUploadWidget } from "@/lib/types";
import type { WidgetActions } from "./widget-actions";

type Reply = { ok: boolean; photoId?: string; message?: string; errorType?: string };

/** Quick checks for fast feedback. Returns the problem, or undefined when the file looks fine. */
function localProblem(file: File, widget: PhotoUploadWidget): string | undefined {
  if (file.size > widget.maxBytes) return `File too large: ${Math.round(file.size / 1024)} KB, the limit is ${Math.round(widget.maxBytes / 1024)} KB.`;
  if (!widget.acceptedTypes.includes(file.type)) return `Unsupported file type "${file.type || "unknown"}". Use ${widget.acceptedTypes.join(", ")}.`;
  return undefined;
}

async function postPhoto(threadId: string, file: File): Promise<{ ok: true } | { error: string }> {
  try {
    const form = new FormData();
    form.append("photo", file);
    const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/photo`, { method: "POST", body: form });
    const body = (await response.json()) as Reply;
    if (!response.ok || !body.photoId) return { error: `${body.errorType ?? "Error"}: ${body.message ?? `HTTP ${response.status}`}` };
    return { ok: true };
  } catch (failure) {
    return { error: `Network error: ${(failure as Error).message}` };
  }
}

export function PhotoUpload({ widget, actions }: { widget: PhotoUploadWidget; actions: WidgetActions }) {
  const [error, setError] = useState<string>();
  const [uploaded, setUploaded] = useState<string>();
  const [sending, setSending] = useState(false);

  const upload = async (file: File) => {
    if (!actions.threadId) return;
    const problem = localProblem(file, widget);
    if (problem) return setError(problem);
    setSending(true);
    setError(undefined);
    const result = await postPhoto(actions.threadId, file);
    setSending(false);
    if ("error" in result) return setError(result.error);
    setUploaded(file.name);
    actions.onSend(`I attached a photo of the damage (${file.name}).`);
  };

  return (
    <section data-testid="photo-upload" aria-label={widget.prompt} className="mt-2 max-w-[85%] rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-600">
        <Camera className="h-3.5 w-3.5" /> {widget.prompt}
      </p>
      {uploaded ? (
        <p data-testid="photo-upload-done" className="text-sm text-emerald-800">Uploaded: {uploaded}</p>
      ) : (
        <input
          data-testid="photo-upload-input"
          type="file"
          accept={widget.acceptedTypes.join(",")}
          disabled={sending}
          onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
          className="text-sm"
        />
      )}
      <p className="mt-1 text-xs text-zinc-600">JPEG, PNG or WebP, up to {Math.round(widget.maxBytes / 1024 / 1024)} MB.</p>
      {error && <p data-testid="photo-upload-error" role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
