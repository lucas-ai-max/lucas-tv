import { NextRequest } from "next/server";
import { SUPERFLIX_BASE_URL } from "@/lib/constants";
import { sanitizeHtml, sanitizeCss, sanitizeJs } from "@/lib/html-sanitizer";
import {
  resolveIPv4,
  httpsRequest,
  rewriteSetCookieForLocalhost,
  SUPERFLIX_HOST,
  SPOOFED_REFERER,
  UpstreamResponse,
} from "@/lib/upstream-fetch";
import { nextProxyIndex } from "@/lib/webshare-proxy";

export const dynamic = "force-dynamic";

const VIDEO_TYPES = /^(video\/|application\/vnd\.apple\.mpegurl|application\/x-mpegurl|application\/octet-stream)/i;
const MAX_BODY_SIZE = 5 * 1024 * 1024;

// HTML cache only — POST responses are never cached.
const cache = new Map<string, { body: string; contentType: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL) cache.delete(key);
  }
}

function buildForwardHeaders(
  request: NextRequest,
  isPost: boolean,
  urlParam: string
): Record<string, string> {
  const headers: Record<string, string> = { Referer: SPOOFED_REFERER };
  // Forward cookies only when the upstream actually needs them: POST API calls
  // and /player/* endpoints (which use the Laravel session). For top-level
  // page loads (/filme/X, /serie/X) sending stale cookies from a different
  // proxy IP makes the upstream Laravel session fingerprint mismatch and
  // sometimes crash, surfacing as a Cloudflare 520. Letting the upstream
  // issue a fresh session per page load is safer.
  const needsCookies = isPost || urlParam.startsWith("/player/");
  if (needsCookies) {
    const cookie = request.headers.get("cookie");
    if (cookie) {
      const filtered = cookie
        .split(";")
        .map((c) => c.trim())
        .filter((c) => !c.startsWith("lucas-tv-auth="))
        .join("; ");
      if (filtered) headers["Cookie"] = filtered;
    }
  }
  if (isPost) {
    const ct = request.headers.get("content-type");
    if (ct) headers["Content-Type"] = ct;
    const xrw = request.headers.get("x-requested-with");
    if (xrw) headers["X-Requested-With"] = xrw;
    const xcsrf = request.headers.get("x-csrf-token");
    if (xcsrf) headers["X-CSRF-TOKEN"] = xcsrf;
    const origin = request.headers.get("origin");
    if (origin) headers["Origin"] = `https://${SUPERFLIX_HOST}`;
  }
  return headers;
}

function buildResponseHeaders(
  upstream: UpstreamResponse,
  extraContentType?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": extraContentType || upstream.contentType || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  };
  // Forward Set-Cookie (rewritten so the browser keeps them over http localhost).
  if (upstream.setCookies.length > 0) {
    // Note: Response headers don't support multiple Set-Cookie via plain object,
    // so we use a Headers object below for multi-cookie responses.
  }
  return headers;
}

async function handleProxy(
  request: NextRequest,
  urlParam: string,
  method: "GET" | "POST"
): Promise<Response> {
  const isPost = method === "POST";
  const upstreamUrl = `${SUPERFLIX_BASE_URL}${urlParam}`;

  // Cache only GET HTML responses.
  if (method === "GET") {
    cleanCache();
    const cached = cache.get(urlParam);
    if (cached) {
      return new Response(cached.body, {
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control": "no-store",
          "X-Proxy-Cache": "HIT",
        },
      });
    }
  }

  let body: Buffer | undefined;
  if (isPost) {
    const ab = await request.arrayBuffer();
    body = Buffer.from(ab);
  }

  // Sticky proxy: the upstream's Laravel session is IP-fingerprinted, so all
  // requests from a single browser must use the same exit IP. We store the
  // proxy index in a cookie; subsequent requests reuse it. If absent, pick
  // round-robin from the available proxies.
  const cookieHeader = request.headers.get("cookie") || "";
  const idxMatch = cookieHeader.match(/_proxy_idx=(\d+)/);
  let proxyIndex = idxMatch ? Number(idxMatch[1]) : await nextProxyIndex();
  const stickyCookie = idxMatch
    ? null
    : `_proxy_idx=${proxyIndex}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24}`;

  let upstream: UpstreamResponse;
  try {
    const ip = await resolveIPv4(SUPERFLIX_HOST);
    // Retry on transient 520/521/522/523/524. Use the same sticky proxy each
    // attempt so a partial session doesn't lose state; only fall back to a
    // different proxy if the sticky one is consistently failing.
    const transient = (s: number) => s >= 520 && s <= 524;
    const MAX_ATTEMPTS = 5;
    let attempt = 0;
    let currentIndex = proxyIndex;
    do {
      attempt++;
      upstream = await httpsRequest(ip, SUPERFLIX_HOST, urlParam, {
        method,
        body,
        extraHeaders: buildForwardHeaders(request, isPost, urlParam),
        timeoutMs: 15000,
        proxyIndex: currentIndex,
      });
      if (!transient(upstream.status)) break;
      // On transient failure, try the next proxy in the rotation.
      currentIndex = await nextProxyIndex();
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 200));
      }
    } while (attempt < MAX_ATTEMPTS);
    // If we ended up on a different proxy than the cookie indicated, update
    // the cookie so future requests stick to the working proxy.
    if (currentIndex !== proxyIndex) {
      proxyIndex = currentIndex;
    }
    if (transient(upstream.status)) {
      console.error(`[proxy] all ${MAX_ATTEMPTS} proxy attempts hit ${upstream.status} for ${urlParam}`);
    }
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("[proxy] upstream fetch failed:", method, upstreamUrl, detail);
    return new Response(`Upstream timeout or error\n\n${detail}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Build a Headers object so we can carry multiple Set-Cookie values.
  const respHeaders = new Headers();
  for (const cookie of upstream.setCookies) {
    respHeaders.append("Set-Cookie", rewriteSetCookieForLocalhost(cookie));
  }
  // Persist the proxy index so subsequent requests from this browser stick
  // to the same exit IP.
  if (stickyCookie || !idxMatch || Number(idxMatch[1]) !== proxyIndex) {
    respHeaders.append(
      "Set-Cookie",
      `_proxy_idx=${proxyIndex}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24}`
    );
  }

  if (!upstream.ok) {
    const snippet = upstream.buffer.toString("utf-8").slice(0, 500);
    console.error("[proxy] upstream error:", upstream.status, upstreamUrl);
    respHeaders.set("Content-Type", upstream.contentType || "text/plain; charset=utf-8");
    return new Response(upstream.buffer.toString("utf-8") || snippet, {
      status: upstream.status,
      headers: respHeaders,
    });
  }

  const contentType = upstream.contentType;

  if (VIDEO_TYPES.test(contentType)) {
    return Response.redirect(upstreamUrl, 302);
  }

  if (upstream.buffer.byteLength > MAX_BODY_SIZE) {
    return Response.redirect(upstreamUrl, 302);
  }

  // For POST: typically returns JSON. Pass through with cookies, no sanitization.
  if (isPost) {
    respHeaders.set("Content-Type", contentType || "application/json");
    respHeaders.set("Cache-Control", "no-store");
    return new Response(upstream.buffer.toString("utf-8"), {
      status: upstream.status,
      headers: respHeaders,
    });
  }

  const text = new TextDecoder("utf-8").decode(upstream.buffer);
  let sanitized: string;
  let responseContentType: string;

  if (contentType.includes("text/html") || contentType.includes("text/xml")) {
    sanitized = sanitizeHtml(text, urlParam);
    responseContentType = "text/html; charset=utf-8";
  } else if (contentType.includes("text/css")) {
    sanitized = sanitizeCss(text, urlParam);
    responseContentType = "text/css; charset=utf-8";
  } else if (contentType.includes("javascript") || contentType.includes("text/js")) {
    sanitized = sanitizeJs(text);
    responseContentType = "application/javascript; charset=utf-8";
  } else if (contentType.includes("image/")) {
    const ab = upstream.buffer.buffer.slice(
      upstream.buffer.byteOffset,
      upstream.buffer.byteOffset + upstream.buffer.byteLength
    ) as ArrayBuffer;
    respHeaders.set("Content-Type", contentType);
    respHeaders.set("Cache-Control", "public, max-age=3600");
    return new Response(ab, { headers: respHeaders });
  } else if (contentType.includes("application/json")) {
    sanitized = text;
    responseContentType = "application/json; charset=utf-8";
  } else {
    sanitized = text;
    responseContentType = contentType || "application/octet-stream";
  }

  // Cache only HTML/CSS/JS GET responses that don't carry cookies.
  if (method === "GET" && upstream.setCookies.length === 0) {
    cache.set(urlParam, {
      body: sanitized,
      contentType: responseContentType,
      timestamp: Date.now(),
    });
  }

  respHeaders.set("Content-Type", responseContentType);
  respHeaders.set("Cache-Control", "no-store");
  respHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(sanitized, { headers: respHeaders });
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  if (!urlParam) return new Response("Missing url parameter", { status: 400 });
  if (!urlParam.startsWith("/") || urlParam.includes("..")) {
    return new Response("Invalid url parameter", { status: 400 });
  }
  return handleProxy(request, urlParam, "GET");
}

export async function POST(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  if (!urlParam) return new Response("Missing url parameter", { status: 400 });
  if (!urlParam.startsWith("/") || urlParam.includes("..")) {
    return new Response("Invalid url parameter", { status: 400 });
  }
  return handleProxy(request, urlParam, "POST");
}
