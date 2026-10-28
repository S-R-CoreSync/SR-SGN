export const DEFAULT_LANDING_THEME_COLOR = "#1a5632";

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Returns true only for #RGB or #RRGGBB hexadecimal colors. */
export function isValidThemeColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value);
}

/**
 * Returns a normalized #RRGGBB color, or the default when the value is not a
 * valid hexadecimal color. Safe for interpolation into CSS / style elements.
 */
export function safeThemeColor(value: unknown): string {
  if (!isValidThemeColor(value)) return DEFAULT_LANDING_THEME_COLOR;
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
  }
  return value.toLowerCase();
}
