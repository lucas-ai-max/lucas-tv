const SUPERFLIX_HOST = "superflixapi.online";

// --- Blocklists ---

const BLOCKED_SCRIPT_SRCS =
  /ads|adserv|doubleclick|googlesyndication|popads|popcash|propeller|sandbox\.php|tracker|analytics|adblock|monetag|monetization|disable-devtool|trex\.php|chorume|\.xyz\//i;

// Only block scripts that are *clearly* ad/anti-adblock loaders. Legitimate
// player scripts often contain window.open / .click() / document.write for
// downloads, etc. — those are neutralised at runtime by the protective script
// (window.open override, location.assign/replace rewrites, click handler
// interception). Static content-blocking was removing the 32KB tab-button
// handler in superflixapi's player by mistake.
const BLOCKED_SCRIPT_CONTENT = [
  /adblock\s*detect/i,
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
  // Hide that we're inside a (sandboxed) iframe. The player's detectSandbox
  // checks frameElement.hasAttribute('sandbox') — with frameElement null, the
  // call throws and is caught silently, allowing the player to continue.
  try{Object.defineProperty(window,'frameElement',{get:function(){return null;},configurable:true});}catch(e){}
  // Second detectSandbox check: \`document.domain = document.domain\`.
  // In a sandboxed iframe Chrome throws a SecurityError mentioning "sandbox",
  // which the player uses as a signal. Override the setter to swallow.
  try{Object.defineProperty(document,'domain',{get:function(){return '${SUPERFLIX_HOST}';},set:function(){},configurable:true});}catch(e){}
  // Third detectSandbox check: navigator.plugins.namedItem('Chrome PDF Viewer').
  // If this returns truthy (it does in modern Chrome), the player proceeds to
  // create a probe element and call document.body.appendChild — which throws
  // because body doesn't exist yet (we run in <head>). Returning a fake empty
  // plugins object makes namedItem return null → player returns early.
  try{
    var _emptyPlugins={length:0,namedItem:function(){return null;},item:function(){return null;},refresh:function(){}};
    Object.defineProperty(navigator,'plugins',{get:function(){return _emptyPlugins;},configurable:true});
  }catch(e){}
  // Block top navigation entirely (sandbox already blocks it; this adds a
  // belt to the suspenders in case the sandbox is somehow bypassed).
  try{Object.defineProperty(window,'top',{get:function(){return window;},configurable:true});}catch(e){}
  try{Object.defineProperty(window,'parent',{get:function(){return window;},configurable:true});}catch(e){}
  // Spoof window.location so the player's hostname check thinks it's on
  // the real site. Relative URL resolution is unaffected (uses the actual
  // document base URL). This prevents the intentional crash when the player
  // detects it's running on a non-superflixapi hostname.
  try{
    var _rl=window.location;
    Object.defineProperty(window,'location',{
      get:function(){
        return new Proxy(_rl,{
          get:function(t,p){
            if(p==='hostname'||p==='host')return HOST;
            if(p==='origin')return 'https://'+HOST;
            if(p==='protocol')return 'https:';
            var v=t[p];
            return typeof v==='function'?v.bind(t):v;
          }
        });
      },
      configurable:true
    });
  }catch(e){}
  // Freeze console.clear so disable-devtool can't hide errors
  try{var _cc=console.clear;console.clear=function(){};}catch(e){}
  // The upstream player defines a global __Y whose init() calls methods
  // (firstP, firstI, secondI...) that are normally added by an ad/popup
  // script loaded from a third-party domain. When that script is blocked
  // (ad blocker, our blocklist, DNS filter), the missing methods cause
  // TypeError. Wrap __Y in a Proxy that returns no-op functions for any
  // undefined property — popups are intentionally disabled anyway.
  try{
    var _yStash;
    Object.defineProperty(window,'__Y',{
      get:function(){return _yStash;},
      set:function(v){
        if(v&&typeof v==='object'){
          _yStash=new Proxy(v,{
            get:function(t,p){
              if(p in t)return t[p];
              return function(){return null;};
            }
          });
        } else {_yStash=v;}
      },
      configurable:true
    });
  }catch(e){}
  // Rewrite upstream URLs to go through our same-origin proxy.
  function rw(u){
    if(typeof u!=='string')return u;
    // Anti-proxy sandbox check: route to upstream with correct origin so server validates OK.
    if(u.indexOf('sanbox.php')!==-1){
      return '/api/proxy?url='+encodeURIComponent('/sanbox.php?https://'+HOST+'/');
    }
    // Cloudflare RUM analytics: discard silently (not needed, causes 404 noise).
    if(u.indexOf('cdn-cgi/')!==-1)return null;
    // Absolute upstream URLs → proxy
    if(u.indexOf(HOST)!==-1){
      try{
        var parsed=new URL(u,location.href);
        if(parsed.hostname.indexOf(HOST)===-1)return u;
        return '/api/proxy?url='+encodeURIComponent(parsed.pathname+parsed.search);
      }catch(e){return u;}
    }
    // Root-relative paths that aren't our own → proxy them.
    // Player makes calls like fetch('/player/bootstrap') which the iframe
    // would resolve against localhost; we must route them through the proxy
    // so they reach the upstream API.
    if(u.charAt(0)==='/'
       && u.indexOf('/api/')!==0
       && u.indexOf('/_next/')!==0
       && u.indexOf('/sanbox.php')!==0
       && u.indexOf('//')!==0){
      return '/api/proxy?url='+encodeURIComponent(u);
    }
    return u;
  }
  // Block popups
  try{Object.defineProperty(window,'open',{value:function(){return null},writable:false,configurable:false});}catch(e){window.open=function(){return null};}
  // fetch — null return means discard (return resolved empty response)
  if(window.fetch){
    var of=window.fetch;
    window.fetch=function(u,o){
      var r=rw(u);
      if(r===null)return Promise.resolve(new Response('',{status:200}));
      return of.call(this,r,o);
    };
  }
  // XHR
  try{
    var oo=XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open=function(m,u){
      var r=rw(u);
      if(r===null){
        // Replace with a no-op: point to a data URL that returns empty
        arguments[1]='data:text/plain,';
      } else {
        arguments[1]=r;
      }
      return oo.apply(this,arguments);
    };
  }catch(e){}
  // sendBeacon (Cloudflare RUM / cdn-cgi) — discard silently
  if(navigator&&navigator.sendBeacon){
    var ob=navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon=function(u,d){var r=rw(u);if(r===null)return true;return ob(r,d);};
  }
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
</script>
<style>
/* Hide the player's built-in back button (Lucas TV has its own). */
#btn-back, .player-back, .btn-back, a[href*="javascript:history"], a[onclick*="history.back"] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
/* Kill click-trap overlays: transparent full-viewport divs with max z-index
   that the upstream injects to capture clicks and open popup ads. They have
   inline styles like opacity:0.01 + z-index:2147483647. */
div[style*="opacity:0.01"][style*="z-index:2147483647"],
div[style*="opacity: 0.01"][style*="z-index: 2147483647"],
div[style*="opacity:0.0"][style*="z-index:2147483"],
div[style*="2147483647"] {
  display: none !important;
  pointer-events: none !important;
}
</style>
<script>
(function(){
  // Runtime defense: remove click-trap overlays as soon as they're appended.
  // Some player scripts add them dynamically after page load.
  function killTrap(el){
    if(!el||el.nodeType!==1)return;
    var s=el.getAttribute&&el.getAttribute('style')||'';
    if(s.indexOf('2147483647')!==-1||(s.indexOf('opacity:0.01')!==-1&&s.indexOf('position:fixed')!==-1)){
      try{el.parentNode&&el.parentNode.removeChild(el);}catch(e){}
    }
  }
  try{
    var mo=new MutationObserver(function(records){
      records.forEach(function(r){
        r.addedNodes&&Array.prototype.forEach.call(r.addedNodes,killTrap);
      });
    });
    document.addEventListener('DOMContentLoaded',function(){
      mo.observe(document.body,{childList:true,subtree:true});
    });
    // Also observe documentElement in case body isn't ready
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }catch(e){}
})();
</script>`;

  // Inject as early as possible so overrides are in place before any
  // inline or synchronous external scripts execute.
  if (/<head[^>]*>/i.test(result)) {
    result = result.replace(/<head([^>]*)>/i, `<head$1>${protectiveScript}`);
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
