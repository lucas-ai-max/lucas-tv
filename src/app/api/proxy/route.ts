import { NextRequest } from "next/server";
import { SUPERFLIX_BASE_URL } from "@/lib/constants";
import { sanitizeHtml, sanitizeCss, sanitizeJs } from "@/lib/html-sanitizer";

export const dynamic = "force-dynamic";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const VIDEO_TYPES = /^(video\/|application\/vnd\.apple\.mpegurl|application\/x-mpegurl|application\/octet-stream)/i;
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB

// Simple in-memory cache
const cache = new Map<string, { body: string; contentType: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");

  if (!urlParam) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Validate path
  if (!urlParam.startsWith("/") || urlParam.includes("..")) {
    return new Response("Invalid url parameter", { status: 400 });
  }

  // Check cache
  cleanCache();
  const cached = cache.get(urlParam);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=300",
        "X-Proxy-Cache": "HIT",
      },
    });
  }

  // Fetch from upstream
  const upstreamUrl = `${SUPERFLIX_BASE_URL}${urlParam}`;

  let upstream: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    upstream = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Referer: `${SUPERFLIX_BASE_URL}/`,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);
  } catch {
    return new Response("Upstream timeout or error", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(`Upstream error: ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const contentType = upstream.headers.get("Content-Type") || "";

  // Video streams: redirect directly to upstream (don't proxy binary)
  if (VIDEO_TYPES.test(contentType)) {
    return Response.redirect(upstreamUrl, 302);
  }

  // Read body with size limit
  const buffer = await upstream.arrayBuffer();
  if (buffer.byteLength > MAX_BODY_SIZE) {
    return Response.redirect(upstreamUrl, 302);
  }

  const body = new TextDecoder("utf-8").decode(buffer);
  let sanitized: string;
  let responseContentType: string;

  if (contentType.includes("text/html") || contentType.includes("text/xml")) {
    sanitized = sanitizeHtml(body, urlParam);
    responseContentType = "text/html; charset=utf-8";
  } else if (contentType.includes("text/css")) {
    sanitized = sanitizeCss(body, urlParam);
    responseContentType = "text/css; charset=utf-8";
  } else if (
    contentType.includes("javascript") ||
    contentType.includes("text/js")
  ) {
    sanitized = sanitizeJs(body);
    responseContentType = "application/javascript; charset=utf-8";
  } else if (contentType.includes("image/")) {
    // Images: pass through as binary
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } else {
    // Unknown: pass through as-is
    sanitized = body;
    responseContentType = contentType || "application/octet-stream";
  }

  // Cache the result
  cache.set(urlParam, {
    body: sanitized,
    contentType: responseContentType,
    timestamp: Date.now(),
  });

  // Build response without upstream cookies
  return new Response(sanitized, {
    headers: {
      "Content-Type": responseContentType,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "X-Proxy-Cache": "MISS",
    },
  });
}
