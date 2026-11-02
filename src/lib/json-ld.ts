/**
 * Serialises a value for embedding inside a <script type="application/ld+json"> element.
 * JSON.stringify does not escape HTML-significant characters, so a value containing
 * "</script>" would terminate the element. The characters below are replaced with
 * their JSON unicode escapes, which are semantically identical for JSON parsers.
 */
export function safeJsonLd(value: unknown): string {
  return (JSON.stringify(value) ?? "null")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
