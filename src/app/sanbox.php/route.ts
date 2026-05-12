import {
  resolveIPv4,
  httpsGet,
  SUPERFLIX_HOST,
  SUPERFLIX_ORIGIN,
  SPOOFED_REFERER,
} from "@/lib/upstream-fetch";

export const dynamic = "force-dynamic";

// The player calls GET /sanbox.php?[currentUrl] as an anti-proxy check.
// It expects the response that superflixapi.rest/sanbox.php normally returns.
// We proxy the request back to the upstream with the correct origin in the
// query so the server-side validation passes.
export async function GET() {
  try {
    const ip = await resolveIPv4(SUPERFLIX_HOST);
    const upstream = await httpsGet(
      ip,
      SUPERFLIX_HOST,
      `/sanbox.php?${SUPERFLIX_ORIGIN}/`,
      { Referer: SPOOFED_REFERER },
      10000
    );

    // If upstream returned a valid non-error response, pass it through.
    // Otherwise fall through to the minimal fallback below.
    if (upstream.ok) {
      const ab = upstream.buffer.buffer.slice(
        upstream.buffer.byteOffset,
        upstream.buffer.byteOffset + upstream.buffer.byteLength
      ) as ArrayBuffer;
      return new Response(ab, {
        status: 200,
        headers: {
          "Content-Type": upstream.contentType || "text/plain",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      });
    }
  } catch {
    // fall through
  }

  // Upstream unreachable or returned error (e.g. 404 because we lack
  // the Cloudflare cookie for superflixapi.online). Return a minimal
  // JavaScript stub that satisfies the player's eval/function-check.
  return new Response("var _sbx=1;", {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
