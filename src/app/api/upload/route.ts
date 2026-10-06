import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/session";
import { ACCEPTED_MIME_TYPES } from "@/lib/upload-limits";
import { uploadQuotaFor } from "@/lib/upload-quota";

/**
 * Issues a one-shot client upload token for Vercel Blob, so the file goes
 * straight from the browser to Blob and never passes through a function —
 * a meeting recording is far larger than a request body may be.
 *
 * This is the gate: the token is only minted for a signed-in user who is
 * inside their budget, and it carries the size and type ceiling with it, so
 * the browser cannot widen them.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (!session) throw new Error("Sign in to upload a recording.");

        const { budget, rate } = await uploadQuotaFor(session.user);
        if (!rate.ok) throw new Error(rate.message);

        return {
          allowedContentTypes: ACCEPTED_MIME_TYPES,
          maximumSizeInBytes: budget.maxBytes,
          // Recording names collide constantly ("audio.m4a"), and blobs are
          // immutable by preference, so every upload gets its own path.
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },

      // Vercel Blob cannot reach localhost, so this never fires in local
      // development. The Meeting row is created by the createMeeting action
      // once the browser sees the upload finish, which works in both places.
      onUploadCompleted: async ({ blob }) => {
        console.log(`[upload] blob stored: ${blob.pathname}`);
      },
    });

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}
