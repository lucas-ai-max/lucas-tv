import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as https from "node:https";

export interface ProxyEntry {
  host: string;
  port: number;
  username: string;
  password: string;
}

let cache: { proxies: ProxyEntry[]; at: number } | null = null;
const LIST_TTL = 30 * 60 * 1000; // 30 min

function parse(raw: string): ProxyEntry[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("{"))
    .map((line) => {
      const [host, portStr, username, password] = line.split(":");
      return { host, port: Number(portStr), username, password };
    })
    .filter((p) => p.host && p.port && p.username && p.password);
}

async function fromFile(): Promise<ProxyEntry[]> {
  try {
    const filePath = path.join(process.cwd(), "proxies.txt");
    const raw = await fs.readFile(filePath, "utf-8");
    return parse(raw);
  } catch {
    return [];
  }
}

function fetchList(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Webshare list HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        let data = "";
        res.on("data", (c: Buffer) => (data += c.toString("utf-8")));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function fromUrl(): Promise<ProxyEntry[]> {
  const url = process.env.WEBSHARE_LIST_URL;
  if (!url) return [];
  try {
    const raw = await fetchList(url);
    return parse(raw);
  } catch (err) {
    console.error("[webshare] failed to fetch list URL:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function getProxies(): Promise<ProxyEntry[]> {
  if (cache && Date.now() - cache.at < LIST_TTL) return cache.proxies;
  // Local file first (Webshare's download URL revokes its token sometimes;
  // the file is the stable source committed to local dev).
  let proxies = await fromFile();
  if (proxies.length === 0) proxies = await fromUrl();
  cache = { proxies, at: Date.now() };
  return proxies;
}

// Round-robin pick — guaranteed to use a different proxy each call (until
// the list is exhausted, then wraps). Better than random for retry scenarios
// where the same banned proxy could otherwise be chosen twice in a row.
let cursor = 0;
export async function pickProxy(): Promise<ProxyEntry | null> {
  const list = await getProxies();
  if (list.length === 0) return null;
  const p = list[cursor % list.length];
  cursor++;
  return p;
}

// Sticky pick — same index always returns the same proxy. Used when the
// upstream binds the session to the originating IP and we must use the same
// exit IP for all of the user's requests.
export async function proxyAt(index: number): Promise<ProxyEntry | null> {
  const list = await getProxies();
  if (list.length === 0) return null;
  return list[Math.abs(index) % list.length];
}

export async function nextProxyIndex(): Promise<number> {
  const list = await getProxies();
  if (list.length === 0) return 0;
  const idx = cursor % list.length;
  cursor++;
  return idx;
}
