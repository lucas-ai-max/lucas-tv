const SUPERFLIX_HOST = "superflixapi.rest";

// --- Blocklists ---

const BLOCKED_SCRIPT_SRCS =
  /ads|adserv|doubleclick|googlesyndication|popads|popcash|propeller|sandbox\.php|tracker|analytics|adblock|monetag|monetization/i;

const BLOCKED_SCRIPT_CONTENT = [
  /pop(up|under)/i,
  /window\s*\.\s*open\s*\(/i,
  /(window|document|top)\s*\.\s*location\s*(=|\.assign|\.replace|\.href\s*=)/i,
  /sandbox\.php/i,
  /createElement\s*\(\s*['"]iframe['"]\s*\)/i,
  /document\.write/i,
  /\.click\s*\(\s*\)/i,
  /adblock/i,
  /monetag|monetiz/i,
];

const EVENT_HANDLER_RE =
  /\s+on(click|load|error|mouseover|mousedown|mouseup|unload|beforeunload|contextmenu|focus|blur|touchstart|pointerdown)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;

const META_REFRESH_RE =
  /<meta\s+[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi;

const VIDEO_EXTENSIONS = /\.(m3u8|mp4|ts|webm|mkv|avi|flv)(\?|#|$)/i;

const PASSTHROUGH_DOMAINS =
  /cdn\.|stream\.|video\.|akamai|cloudfront|googlevideo|hls\.|vod\./i;

// --- Main functions ---

export function sanitizeHtml(html: string, originalPath: string): string {
  let result = html;

  // Step 1: Remove blocked scripts (and rewrite URLs in survivors)
  result = result.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
    (match, attrs: string, content: string) => {
      // Check src attribute
      const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if (srcMatch && BLOCKED_SCRIPT_SRCS.test(srcMatch[1])) {
        return "<!-- blocked -->";
      }

      // Check inline content
      if (content.trim()) {
        for (const pattern of BLOCKED_SCRIPT_CONTENT) {
          if (pattern.test(content)) {
            return "<!-- blocked -->";
          }
        }
      }

      // Survivor with external src: rewrite the src URL.
      if (srcMatch) {
        const rewritten = rewriteUrl(srcMatch[1], originalPath);
        if (rewritten !== srcMatch[1]) {
          return match.replace(srcMatch[1], rewritten);
        }
        return match;
      }

      // Survivor with inline body: rewrite any hardcoded absolute superflix
      // URLs in the script source so dynamic navigation/fetches stay same-origin.
      if (content.trim()) {
        const rewrittenContent = rewriteAbsoluteSuperflixUrls(content);
        if (rewrittenContent !== content) {
          return `<script${attrs}>${rewrittenContent}</script>`;
        }
      }

      return match;
    }
  );

  // Step 2: Remove event handler attributes
  result = result.replace(EVENT_HANDLER_RE, "");

  // Step 3: Remove meta refresh
  result = result.replace(META_REFRESH_RE, "<!-- blocked -->");

  // Step 4: Remove ad iframes (keep only superflix/video iframes)
  result = result.replace(
    /<iframe\b([^>]*)>([\s\S]*?)<\/iframe>/gi,
    (match, attrs: string) => {
      const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if (!srcMatch) return "<!-- blocked -->";
      const src = srcMatch[1];
      if (
        src.includes(SUPERFLIX_HOST) ||
        VIDEO_EXTENSIONS.test(src) ||
        PASSTHROUGH_DOMAINS.test(src)
      ) {
        return match;
      }
      return "<!-- blocked -->";
    }
  );

  // Step 5: Rewrite URLs in src and href attributes
  result = rewriteSuperflixUrls(result, originalPath);

  // Step 6: Inject protective script after <head> or at start of <body>
  const protectiveScript = `<script>
(function(){
  var HOST='${SUPERFLIX_HOST}';
  function rw(u){
    if(typeof u!=='string'||u.indexOf(HOST)===-1)return u;
    try{
      var parsed=new URL(u,location.href);
      if(parsed.hostname.indexOf(HOST)===-1)return u;
      return '/api/proxy?url='+encodeURIComponent(parsed.pathname+parsed.search);
    }catch(e){return u;}
  }
  // Block popups
  try{Object.defineProperty(window,'open',{value:function(){return null},writable:false,configurable:false});}catch(e){window.open=function(){return null};}
  // fetch
  if(window.fetch){
    var of=window.fetch;
    window.fetch=function(u,o){return of.call(this,rw(u),o);};
  }
  // XHR
  try{
    var oo=XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open=function(m,u){arguments[1]=rw(u);return oo.apply(this,arguments);};
  }catch(e){}
  // location.assign / .replace
  try{
    var la=window.location.assign.bind(window.location);
    window.location.assign=function(u){return la(rw(u));};
  }catch(e){}
  try{
    var lr=window.location.replace.bind(window.location);
    window.location.replace=function(u){return lr(rw(u));};
  }catch(e){}
  // Link clicks
  document.addEventListener('click',function(e){
    var t=e.target;
    var a=t&&t.closest?t.closest('a[href]'):null;
    if(!a)return;
    var h=a.getAttribute('href');
    if(h&&h.indexOf(HOST)!==-1){
      e.preventDefault();
      e.stopPropagation();
      window.location.href=rw(h);
    }
  },true);
  // Form submissions
  document.addEventListener('submit',function(e){
    var f=e.target;
    if(f&&f.action&&f.action.indexOf(HOST)!==-1){
      f.action=rw(f.action);
    }
  },true);
})();
</script>`;

  if (result.includes("</head>")) {
    result = result.replace("</head>", protectiveScript + "</head>");
  } else if (result.includes("<body")) {
    result = result.replace(/<body([^>]*)>/i, `<body$1>${protectiveScript}`);
  } else {
    result = protectiveScript + result;
  }

  return result;
}

export function sanitizeCss(css: string, originalPath: string): string {
  // Rewrite url() references
  return css.replace(
    /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi,
    (match, url: string) => {
      if (shouldPassthrough(url)) return match;
      const rewritten = rewriteUrl(url, originalPath);
      return `url("${rewritten}")`;
    }
  );
}

export function sanitizeJs(js: string): string {
  let result = js;

  // Rewrite hardcoded absolute superflix URLs to go through the proxy.
  // Done before the location-killer below so navigations to the proxy still work.
  result = rewriteAbsoluteSuperflixUrls(result);

  // Remove window.open calls
  result = result.replace(
    /window\s*\.\s*open\s*\([^)]*\)/gi,
    "null"
  );

  // Remove location redirects
  result = result.replace(
    /(window|document|top)\s*\.\s*location\s*(=|\.assign\s*\(|\.replace\s*\(|\.href\s*=)/gi,
    "void 0; //"
  );

  // Remove document.write
  result = result.replace(/document\s*\.\s*write\s*\(/gi, "void(");

  return result;
}

// --- Helpers ---

function shouldPassthrough(url: string): boolean {
  if (!url || url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("#")) {
    return true;
  }
  if (VIDEO_EXTENSIONS.test(url)) return true;
  if (PASSTHROUGH_DOMAINS.test(url)) return true;
  // Protocol-relative URLs to other domains
  if (url.startsWith("//") && !url.includes(SUPERFLIX_HOST)) return true;
  // Absolute URLs to other domains
  if (/^https?:\/\//.test(url) && !url.includes(SUPERFLIX_HOST)) return true;
  return false;
}

function rewriteUrl(url: string, originalPath: string): string {
  if (shouldPassthrough(url)) return url;

  let path: string;

  if (url.includes(SUPERFLIX_HOST)) {
    // Absolute superflix URL -> extract path
    try {
      const parsed = new URL(url);
      path = parsed.pathname + parsed.search;
    } catch {
      return url;
    }
  } else if (url.startsWith("/")) {
    // Root-relative
    path = url;
  } else {
    // Relative to current path
    const dir = originalPath.substring(0, originalPath.lastIndexOf("/") + 1);
    path = dir + url;
  }

  return `/api/proxy?url=${encodeURIComponent(path)}`;
}

// Rewrites any absolute URL pointing at the superflix host (https://, http://,
// or protocol-relative //) into a same-origin proxy URL. Used for free-form
// text like script bodies and CSS where attribute-level rewriting can't reach.
function rewriteAbsoluteSuperflixUrls(text: string): string {
  return text.replace(
    /(?:https?:)?\/\/superflixapi\.rest((?:\/[^\s"'`<>)\\]*)?)/gi,
    (_match, path: string) => {
      const p = path || "/";
      return `/api/proxy?url=${encodeURIComponent(p)}`;
    }
  );
}

function rewriteSuperflixUrls(html: string, originalPath: string): string {
  // Rewrite src="..." and href="..." attributes
  return html.replace(
    /((?:src|href|action)\s*=\s*["'])([^"']+)(["'])/gi,
    (match, prefix: string, url: string, suffix: string) => {
      if (shouldPassthrough(url)) return match;
      const rewritten = rewriteUrl(url, originalPath);
      if (rewritten === url) return match;
      return prefix + rewritten + suffix;
    }
  );
}
