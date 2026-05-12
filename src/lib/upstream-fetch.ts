import { Resolver } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import * as tls from "node:tls";
import * as zlib from "node:zlib";
import { pickProxy, proxyAt, type ProxyEntry } from "./webshare-proxy";

export const SUPERFLIX_HOST = "superflixapi.online";
export const SUPERFLIX_ORIGIN = `https://${SUPERFLIX_HOST}`;
// Pretend to come from a partner site so the upstream serves the actual
// player instead of the "external view" landing page.
export const SPOOFED_REFERER = "https://vizero.buzz/";

const resolver = new Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);

const ipCache = new Map<string, { ip: string; at: number }>();
const IP_TTL = 5 * 60 * 1000;

export async function resolveIPv4(hostname: string): Promise<string> {
  const cached = ipCache.get(hostname);
  if (cached && Date.now() - cached.at < IP_TTL) return cached.ip;
  const addrs = await resolver.resolve4(hostname);
  const ip = addrs[0];
  ipCache.set(hostname, { ip, at: Date.now() });
  return ip;
}

export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "iframe",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-User": "?1",
};

function decompress(buf: Buffer, encoding: string): Promise<Buffer> {
  if (encoding.includes("br"))
    return new Promise((res, rej) =>
      zlib.brotliDecompress(buf, (e, d) => (e ? rej(e) : res(d)))
    );
  if (encoding.includes("gzip"))
    return new Promise((res, rej) =>
      zlib.gunzip(buf, (e, d) => (e ? rej(e) : res(d)))
    );
  if (encoding.includes("deflate"))
    return new Promise((res, rej) =>
      zlib.inflate(buf, (e, d) => (e ? rej(e) : res(d)))
    );
  return Promise.resolve(buf);
}

export interface UpstreamResponse {
  ok: boolean;
  status: number;
  contentType: string;
  buffer: Buffer;
  setCookies: string[];
}

export interface UpstreamRequestOptions {
  method?: string;
  body?: Buffer;
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
  followRedirects?: boolean;
  /** When set, force using the proxy at this index (sticky session). */
  proxyIndex?: number;
}

// Establish a TLS tunnel through a Webshare HTTP proxy via CONNECT.
function connectViaProxy(
  proxy: ProxyEntry,
  hostname: string,
  timeoutMs: number
): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${proxy.username}:${proxy.password}`).toString("base64");
    const req = http.request({
      host: proxy.host,
      port: proxy.port,
      method: "CONNECT",
      path: `${hostname}:443`,
      timeout: timeoutMs,
      headers: { "Proxy-Authorization": `Basic ${auth}`, Host: `${hostname}:443` },
    });
    req.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }
      const tlsSocket = tls.connect({ socket, servername: hostname }, () => {
        resolve(tlsSocket);
      });
      tlsSocket.on("error", reject);
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Proxy CONNECT timed out"));
    });
    req.on("error", reject);
    req.end();
  });
}

interface DispatchContext {
  hostname: string;
  path: string;
  opts: UpstreamRequestOptions;
  followRedirects: boolean;
  timeoutMs: number;
  headers: Record<string, string>;
  method: string;
}

function dispatchRequest(
  options: https.RequestOptions,
  ctx: DispatchContext,
  useHttpOverTls = false
): Promise<UpstreamResponse> {
  // When tunneling through a proxy CONNECT, the socket is already TLS-wrapped.
  // https.request would attempt a second TLS handshake on top, which breaks.
  // http.request sends plain HTTP bytes; the existing TLS layer encrypts them
  // transparently. This is the standard pattern for HTTPS-via-HTTP-proxy.
  const requester = useHttpOverTls ? http.request : https.request;
  return new Promise((resolve, reject) => {
    const req = requester(options, (res) => {
      if (
        ctx.followRedirects &&
        [301, 302, 303, 307, 308].includes(res.statusCode ?? 0) &&
        res.headers.location
      ) {
        req.destroy();
        const next = new URL(res.headers.location, `https://${ctx.hostname}${ctx.path}`);
        resolveIPv4(next.hostname)
          .then((nextIp) =>
            httpsRequest(nextIp, next.hostname, next.pathname + next.search, ctx.opts)
          )
          .then(resolve)
          .catch(reject);
        return;
      }

      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks);
        const encoding = (res.headers["content-encoding"] as string) ?? "";
        const contentType = (res.headers["content-type"] as string) ?? "";
        const rawCookies = res.headers["set-cookie"];
        const setCookies = Array.isArray(rawCookies)
          ? rawCookies
          : rawCookies
          ? [rawCookies]
          : [];
        decompress(raw, encoding)
          .then((buffer) =>
            resolve({
              ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
              status: res.statusCode ?? 0,
              contentType,
              buffer,
              setCookies,
            })
          )
          .catch(reject);
      });
      res.on("error", reject);
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out after ${ctx.timeoutMs}ms`));
    });
    req.on("error", reject);
    if (ctx.opts.body) req.write(ctx.opts.body);
    req.end();
  });
}

export async function httpsRequest(
  ip: string,
  hostname: string,
  path: string,
  opts: UpstreamRequestOptions = {}
): Promise<UpstreamResponse> {
  const method = opts.method ?? "GET";
  const timeoutMs = opts.timeoutMs ?? 20000;
  const followRedirects = opts.followRedirects ?? true;

  const headers: Record<string, string> = {
    Host: hostname,
    ...BROWSER_HEADERS,
    ...(opts.extraHeaders ?? {}),
  };
  if (opts.body) headers["Content-Length"] = String(opts.body.byteLength);

  const ctx: DispatchContext = { hostname, path, opts, followRedirects, timeoutMs, headers, method };

  // If a Webshare proxy is configured, tunnel through it. The CF block on
  // our server IP doesn't apply to the residential/datacenter IP of the proxy.
  // When proxyIndex is provided (sticky session), use that specific proxy.
  const proxy =
    typeof opts.proxyIndex === "number"
      ? await proxyAt(opts.proxyIndex)
      : await pickProxy();
  if (proxy) {
    console.log(`[upstream] via proxy ${proxy.host}:${proxy.port} -> ${hostname}${path}`);
    const tlsSocket = await connectViaProxy(proxy, hostname, timeoutMs);
    return dispatchRequest(
      {
        method,
        path,
        timeout: timeoutMs,
        headers,
        createConnection: () => tlsSocket as unknown as net.Socket,
      },
      ctx,
      true // use http.request over the existing TLS socket
    );
  }

  console.log(`[upstream] DIRECT (no proxy) -> ${hostname}${path}`);
  // Direct path.
  return dispatchRequest(
    {
      host: ip,
      port: 443,
      path,
      method,
      servername: hostname,
      timeout: timeoutMs,
      headers,
    },
    ctx
  );
}

// Backwards-compat wrapper.
export function httpsGet(
  ip: string,
  hostname: string,
  path: string,
  extraHeaders: Record<string, string>,
  timeoutMs: number
): Promise<UpstreamResponse> {
  return httpsRequest(ip, hostname, path, { extraHeaders, timeoutMs });
}

// Strips the Secure flag from a Set-Cookie header so the browser stores it
// over http (localhost dev). Domain is also dropped so the cookie binds to
// our origin instead of the upstream's.
export function rewriteSetCookieForLocalhost(cookie: string): string {
  return cookie
    .split(";")
    .map((p) => p.trim())
    .filter((p) => !/^secure$/i.test(p) && !/^domain=/i.test(p))
    .join("; ");
}
