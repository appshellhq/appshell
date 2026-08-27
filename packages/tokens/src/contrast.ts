/**
 * Contrast checking for a theme.
 *
 * Syntax validation on its own earns little: it catches `--appshell-primary: bananas` and
 * misses `--appshell-on-primary: #fff` on `--appshell-primary: #fff`, which is valid CSS
 * and invisible text. Checking the `on-` pairs catches the failure that reaches users, and
 * subsumes syntax validation for free — a value that will not parse cannot be measured.
 */
import {
  AA_NON_TEXT,
  AA_TEXT,
  MUTED_AGAINST,
  NON_TEXT_PAIRS,
  TEXT_PAIRS,
  type Theme,
  type TokenRole,
} from './contract';

type Rgb = [number, number, number];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

const oklchToRgb = (l: number, c: number, hDeg: number): Rgb => {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  // LMS cone responses, cubed back out of the perceptual space.
  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    clamp01(linearToSrgb(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short)),
    clamp01(linearToSrgb(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short)),
    clamp01(linearToSrgb(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short)),
  ];
};

const OKLCH = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/i;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Returns undefined rather than throwing — an unmeasurable value is reported, not fatal. */
export const parseColor = (value: string): Rgb | undefined => {
  const trimmed = value.trim();

  const oklch = OKLCH.exec(trimmed);
  if (oklch) {
    return oklchToRgb(Number(oklch[1]) / 100, Number(oklch[2]), Number(oklch[3]));
  }

  const hex = HEX.exec(trimmed);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];

    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
  }

  return undefined;
};

const relativeLuminance = ([r, g, b]: Rgb) =>
  0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

/** WCAG 2.1 contrast ratio, 1–21. */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);

  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

export type ContrastFinding = {
  roles: [TokenRole, TokenRole];
  ratio?: number;
  required: number;
  reason: 'below-threshold' | 'unparseable';
};

const check = (
  theme: Theme,
  pairs: readonly (readonly [TokenRole, TokenRole])[],
  required: number,
): ContrastFinding[] =>
  pairs.flatMap(([bg, fg]): ContrastFinding[] => {
    const roles: [TokenRole, TokenRole] = [bg, fg];
    const background = parseColor(theme[bg]);
    const foreground = parseColor(theme[fg]);

    if (!background || !foreground) {
      return [{ roles, required, reason: 'unparseable' }];
    }

    const ratio = contrastRatio(background, foreground);

    return ratio >= required ? [] : [{ roles, ratio, required, reason: 'below-threshold' }];
  });

/**
 * Every finding for a theme. Empty means it passes.
 *
 * `color-mix` values are skipped rather than failed: hover and active are derived from
 * roles that are themselves checked, and resolving them needs a browser.
 */
export const validateTheme = (theme: Theme): ContrastFinding[] => [
  ...check(theme, TEXT_PAIRS, AA_TEXT),
  ...check(
    theme,
    MUTED_AGAINST.map((surface) => [surface, 'text-muted'] as const),
    AA_TEXT,
  ),
  ...check(theme, NON_TEXT_PAIRS, AA_NON_TEXT),
];

export const describeFinding = ({ roles, ratio, required, reason }: ContrastFinding): string =>
  reason === 'unparseable'
    ? `${roles[0]} / ${roles[1]}: could not be measured — one of the values is not a colour this understands.`
    : `${roles[0]} / ${roles[1]}: ${ratio?.toFixed(2)}:1, needs ${required}:1.`;
