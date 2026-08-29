/**
 * Shared color helpers used to keep article HTML theme-agnostic.
 *
 * The editor renders plain text through its own CSS (`.ife-content`
 * `--ife-text`) and expects the site to supply the final colors for a
 * published post. However, a "no color" selection or a default color picker
 * value (`#000000`) makes the browser wrap the selection in
 * `<span style="color: rgb(0, 0, 0)">`. Black text / white background are
 * exactly those default/neutral values: persisting them hard-codes the
 * article to a light-on-dark assumption that a dark theme cannot override
 * because inline styles win over its CSS.
 *
 * These sets/helpers let both the command layer (don't apply a default color
 * at all) and the sanitizer layer (drop any that slip through) strip only
 * those neutral values, while still preserving any genuinely non-default
 * color the author chose (e.g. a red or yellow highlight).
 */

export const DEFAULT_TEXT_COLORS = new Set([
    'black',
    '#000',
    '#000000',
    'rgb(0,0,0)',
    'rgb(0, 0, 0)',
    'rgb(0,0,0,0)',
    'rgba(0,0,0,1)',
    'rgba(0, 0, 0, 1)',
]);

export const DEFAULT_BG_COLORS = new Set([
    'white',
    '#fff',
    '#ffffff',
    'rgb(255,255,255)',
    'rgb(255, 255, 255)',
    'rgba(255,255,255,1)',
    'rgba(255, 255, 255, 1)',
]);

/**
 * Lowercases a CSS color and expands 3-digit hex shorthand (#abc) so it can
 * be compared against the default-neutral color sets.
 * @param {string} value
 * @returns {string}
 */
export function normalizeColor(value) {
    const trimmed = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
    if (/^#[0-9a-f]{3}$/.test(trimmed)) {
        return `#${trimmed.slice(1).split('').map((c) => `${c}${c}`).join('')}`;
    }
    return trimmed;
}

/**
 * @param {string} value a CSS color value (e.g. "#000", "black", "red")
 * @returns {boolean} true when the value is a default/neutral text color
 */
export function isDefaultTextColor(value) {
    return DEFAULT_TEXT_COLORS.has(normalizeColor(value));
}

/**
 * @param {string} value a CSS color value (e.g. "#fff", "white", "#ff0000")
 * @returns {boolean} true when the value is a default/neutral background color
 */
export function isDefaultBgColor(value) {
    return DEFAULT_BG_COLORS.has(normalizeColor(value));
}
