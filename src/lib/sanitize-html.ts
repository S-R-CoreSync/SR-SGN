/**
 * Dependency-free, allowlist-based HTML sanitizer for article content.
 *
 * The output is rebuilt from scratch: only allowlisted tags and attributes are
 * emitted, every attribute value is re-escaped, URLs are restricted to safe
 * schemes, and inline styles are filtered. It is pure and deterministic, so it
 * can run both in API routes (persist-time) and in client/server components
 * (render-time).
 */

const VOID_TAGS = new Set(["br", "hr", "img"]);

const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "div", "span", "strong", "b", "em", "i", "u", "s", "strike", "del", "ins", "mark",
  "small", "sub", "sup", "blockquote", "pre", "code", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "a", "img", "figure", "figcaption", "table", "thead", "tbody", "tfoot",
  "tr", "th", "td", "caption", "video", "iframe",
]);

/** Elements whose entire content (not only the tags) must be discarded. */
const STRIP_WITH_CONTENT =
  "script|style|object|embed|noscript|template|textarea|title|svg|math|xmp|noembed|noframes|head|applet";

const GLOBAL_ATTRS = new Set(["style", "dir", "lang", "title"]);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  iframe: new Set(["src", "width", "height", "allowfullscreen", "frameborder", "loading"]),
  video: new Set(["src", "poster", "controls", "width", "height", "preload"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
  ol: new Set(["start"]),
};
const BOOLEAN_ATTRS = new Set(["controls", "allowfullscreen"]);
const URL_ATTRS = new Set(["href", "src", "poster"]);

const LINK_SCHEMES = new Set(["http", "https", "mailto", "tel"]);
const MEDIA_SCHEMES = new Set(["http", "https"]);
const YOUTUBE_EMBED = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//i;

const ALLOWED_CSS_PROPS = new Set([
  "position", "top", "left", "right", "bottom", "padding", "padding-bottom", "padding-top",
  "padding-left", "padding-right", "margin", "margin-top", "margin-bottom", "margin-left",
  "margin-right", "width", "height", "max-width", "max-height", "min-width", "min-height",
  "overflow", "border", "border-radius", "box-shadow", "background", "background-color",
  "color", "display", "grid-template-columns", "gap", "object-fit", "text-align", "font-size",
  "font-weight", "font-style", "text-decoration", "line-height", "direction",
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", colon: ":", tab: "\t", newline: "\n", nbsp: "\u00a0",
};

function decodeEntities(value: string): string {
  return value.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));?/gi, (match, hex, dec, name) => {
    if (hex !== undefined || dec !== undefined) {
      const cp = hex !== undefined ? parseInt(hex, 16) : parseInt(dec, 10);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return "\ufffd";
      return String.fromCodePoint(cp);
    }
    const named = NAMED_ENTITIES[String(name).toLowerCase()];
    return named !== undefined ? named : match;
  });
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeUrl(value: string, schemes: Set<string>): string | null {
  // Browsers ignore control characters / whitespace inside the scheme.
  const compact = value.replace(/[\u0000-\u0020\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\ufeff]/g, "");
  if (!compact) return null;
  const scheme = /^([a-z][a-z0-9+.\-]*):/i.exec(compact);
  if (scheme) return schemes.has(scheme[1].toLowerCase()) ? value.trim() : null;
  // Without a scheme, a colon before any "/", "?" or "#" is still parsed as one by some agents.
  if (/^[^/?#]*:/.test(compact)) return null;
  return value.trim();
}

function sanitizeStyle(value: string): string {
  if (/\/\*|\*\//.test(value)) return "";
  const out: string[] = [];
  for (const decl of value.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    if (!ALLOWED_CSS_PROPS.has(prop) || !val) continue;
    if (/[\\<>@{}"'`]|url\s*\(|expression|javascript|image-set|var\s*\(|attr\s*\(|behavior|binding/i.test(val)) continue;
    if (prop === "position" && !/^(relative|absolute|static)$/i.test(val)) continue;
    out.push(`${prop}:${val}`);
  }
  return out.join(";");
}

const ATTR_RE = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function buildTag(tag: string, rawAttrs: string): string {
  const allowed = TAG_ATTRS[tag];
  const parts: string[] = [];
  const seen = new Set<string>();
  let hasBlankTarget = false;

  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(rawAttrs)) !== null) {
    const name = m[1].toLowerCase();
    if (seen.has(name)) continue;
    if (!GLOBAL_ATTRS.has(name) && !(allowed && allowed.has(name))) continue;
    seen.add(name);

    if (BOOLEAN_ATTRS.has(name)) {
      parts.push(name);
      continue;
    }

    let value = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "").replace(/[\r\n\t]+/g, " ");

    if (URL_ATTRS.has(name)) {
      const schemes = name === "href" ? LINK_SCHEMES : MEDIA_SCHEMES;
      const safe = safeUrl(value, schemes);
      if (safe === null) continue;
      value = safe;
    } else if (name === "style") {
      value = sanitizeStyle(value);
      if (!value) continue;
    } else if (name === "target") {
      if (value.toLowerCase() !== "_blank") continue;
      hasBlankTarget = true;
      value = "_blank";
    }

    parts.push(`${name}="${escapeAttr(value)}"`);
  }

  if (tag === "iframe") {
    const srcPart = parts.find((p) => p.startsWith("src="));
    const src = srcPart ? decodeEntities(srcPart.slice(5, -1)) : "";
    if (!YOUTUBE_EMBED.test(src)) return "";
  }
  if (tag === "a" && hasBlankTarget) parts.push('rel="noopener noreferrer"');

  return `<${tag}${parts.length ? " " + parts.join(" ") : ""}>`;
}

const TAG_RE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>?/g;

export function sanitizeHtml(input: string): string {
  if (typeof input !== "string" || !input) return "";

  const stripped = input.replace(
    new RegExp(`<(${STRIP_WITH_CONTENT})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`, "gi"),
    ""
  );

  let out = "";
  let last = 0;
  const re = new RegExp(TAG_RE.source, "g");
  let m: RegExpExecArray | null;
  const text = (s: string) => s.replace(/</g, "&lt;");

  while ((m = re.exec(stripped)) !== null) {
    out += text(stripped.slice(last, m.index));
    last = m.index + m[0].length;

    if (m[0].startsWith("<!--")) continue;
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue;

    if (closing) {
      if (!VOID_TAGS.has(tag)) out += `</${tag}>`;
    } else {
      out += buildTag(tag, m[3] || "");
    }
  }
  out += text(stripped.slice(last));
  return out;
}
