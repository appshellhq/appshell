import {
  cssVar,
  type AccentTokens,
  type BaseTokens,
  type Mode,
  type Theme,
  type TokenRole,
} from './contract';
import { ACCENTS, BASES, FOCUS_RINGS } from './presets';

/**
 * `system` follows the viewer's preference. Pinning a scheme is for an application that
 * ships one look on purpose, and it is honoured all the way down: the palette stops
 * varying, the root is stamped so the tokens cannot be swapped underneath it, and the
 * browser is told which scheme to render its own scrollbars and form controls in.
 */
export type ColorScheme = 'system' | 'light' | 'dark';

export type ThemeSelection = {
  /** A base preset name, or the base's own token values. */
  base: string | Record<Mode, BaseTokens>;
  /** An accent preset name, or the accent's own token values. */
  accent: string | AccentTokens;
  /** Defaults to `system`. */
  colorScheme?: ColorScheme;
  /** Overrides applied last, so an Application can adjust a preset without forking it. */
  overrides?: Partial<Theme>;
};

/** The mode a pinned scheme resolves to, or undefined when it follows the viewer. */
export const pinnedMode = (selection: ThemeSelection): Mode | undefined =>
  selection.colorScheme && selection.colorScheme !== 'system' ? selection.colorScheme : undefined;

/**
 * Hover and active are a `color-mix` away from their accent, so a theme never has to
 * author them. The direction flips with the mode — on a dark surface hover lifts toward
 * white, on a light one it deepens toward black — which is why they are resolved per mode
 * rather than once.
 */
const shift = (role: TokenRole, toward: 'white' | 'black', amount: string) =>
  `color-mix(in oklch, var(${cssVar(role)}), ${toward} ${amount})`;

const derived = (mode: Mode, focusRing: string): Record<string, string> => {
  const lift = mode === 'dark' ? 'white' : 'black';
  const press = mode === 'dark' ? 'black' : 'white';

  return {
    'primary-hover': shift('primary', lift, '12%'),
    'primary-active': shift('primary', press, '10%'),
    'secondary-hover': shift('secondary', lift, '12%'),
    'secondary-active': shift('secondary', press, '10%'),
    'focus-ring': focusRing,
  };
};

/** Type and dimensions do not vary by mode, and no preset currently changes them. */
export const DEFAULT_TYPE_AND_DIMENSIONS: Record<string, string> = {
  'font-body': "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  'font-mono': "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  'font-size-h1': '2.25rem',
  'font-size-h2': '1.875rem',
  'font-size-h3': '1.5rem',
  'font-size-h4': '1.25rem',
  'font-size-h5': '1.125rem',
  'font-size-h6': '1rem',
  'font-size-body': '1rem',
  'font-size-small': '0.875rem',
  'line-height-tight': '1.25',
  'line-height-normal': '1.6',
  'space-xs': '0.25rem',
  'space-sm': '0.5rem',
  'space-md': '1rem',
  'space-lg': '1.5rem',
  'space-xl': '2.5rem',
  'radius-sm': '0.25rem',
  'radius-md': '0.5rem',
  'radius-lg': '1rem',
};

const resolveBase = (base: ThemeSelection['base'], mode: Mode): BaseTokens => {
  if (typeof base !== 'string') return base[mode];

  const preset = BASES[base];
  if (!preset) {
    throw new Error(`Unknown base '${base}'. Available: ${Object.keys(BASES).join(', ')}.`);
  }

  return preset[mode];
};

const resolveAccent = (accent: ThemeSelection['accent']): AccentTokens => {
  if (typeof accent !== 'string') return accent;

  const preset = ACCENTS[accent];
  if (!preset) {
    throw new Error(`Unknown accent '${accent}'. Available: ${Object.keys(ACCENTS).join(', ')}.`);
  }

  return preset;
};

/**
 * A focus ring that is only the accent disappears against some surfaces — it fails 3:1 on
 * 7 of the 20 preset combinations. The generated table holds one picked per base+accent
 * that clears it; a custom theme falls back to the accent and is checked at save time.
 */
const resolveFocusRing = (selection: ThemeSelection, accent: AccentTokens, mode: Mode): string => {
  const { base, accent: accentName } = selection;

  if (typeof base === 'string' && typeof accentName === 'string') {
    const ring = FOCUS_RINGS[base]?.[accentName]?.[mode];
    if (ring) return ring;
  }

  return accent.primary;
};

/** The full token map for one mode. */
export const composeTheme = (selection: ThemeSelection, mode: Mode): Theme => {
  const base = resolveBase(selection.base, mode);
  const accent = resolveAccent(selection.accent);

  return {
    ...DEFAULT_TYPE_AND_DIMENSIONS,
    ...base,
    ...accent,
    ...derived(mode, resolveFocusRing(selection, accent, mode)),
    ...selection.overrides,
  } as Theme;
};

/**
 * `declarations` are real CSS properties rather than custom ones, so they are emitted
 * verbatim — `color-scheme` is a property the browser acts on, not a token.
 */
const block = (
  selector: string,
  tokens: Partial<Theme>,
  indent: string,
  declarations: Record<string, string> = {},
) =>
  [
    `${indent}${selector} {`,
    ...Object.entries(declarations).map(([property, value]) => `${indent}  ${property}: ${value};`),
    ...Object.entries(tokens).map(
      ([role, value]) => `${indent}  ${cssVar(role as TokenRole)}: ${value};`,
    ),
    `${indent}}`,
  ].join('\n');

/**
 * Only what actually changes between modes. Type and dimensions never do, and neither do
 * the status colours in some themes — repeating them would triple the size of a block the
 * registry inlines into every page it serves.
 */
const changed = (from: Theme, to: Theme): Partial<Theme> =>
  Object.fromEntries(
    Object.entries(to).filter(([role, value]) => from[role as TokenRole] !== value),
  );

/**
 * A theme with both modes already worked out.
 *
 * This is the shape a *published* theme stores. Resolving a selection and emitting CSS
 * used to be one step, which meant the only way to render a theme was to re-resolve its
 * preset names — so the values behind a name lived in whatever build was deployed, and an
 * Application's recorded appearance moved when that build did. Materialising both modes
 * lets the values be stored, versioned and rendered from, rather than looked up.
 */
export type ResolvedTheme = Record<Mode, Theme>;

/** Works out both modes of a selection, including any overrides it carries. */
export const resolveTheme = (selection: ThemeSelection): ResolvedTheme => ({
  light: composeTheme(selection, 'light'),
  dark: composeTheme(selection, 'dark'),
});

export type CssOptions = {
  /** Defaults to `system`. Belongs to whoever is rendering, not to the theme. */
  colorScheme?: ColorScheme;
  /** Applied over the resolved values, so a consumer can adjust without forking. */
  overrides?: Partial<Theme>;
};

/**
 * Three states, not two: an explicit choice in either direction, and the system default
 * when nothing is stamped on the root. A theme that only handled `prefers-color-scheme`
 * would give a viewer no way to override it.
 */
export const cssFrom = (resolved: ResolvedTheme, options: CssOptions = {}): string => {
  const { colorScheme, overrides } = options;
  const pinned = colorScheme && colorScheme !== 'system' ? colorScheme : undefined;
  const withOverrides = (theme: Theme): Theme => ({ ...theme, ...overrides });

  /*
   * `color-scheme` is what tells the browser which way to render the things CSS does not
   * reach — scrollbars, form controls, the canvas behind the page. Without it a dark
   * theme still gets light scrollbars.
   */
  if (pinned) {
    return `${block(':root', withOverrides(resolved[pinned]), '', { 'color-scheme': pinned })}\n`;
  }

  const light = withOverrides(resolved.light);
  const dark = withOverrides(resolved.dark);
  const delta = changed(light, dark);

  return [
    block(':root', light, '', { 'color-scheme': 'light dark' }),
    '',
    '@media (prefers-color-scheme: dark) {',
    block(':root:not([data-appshell-theme="light"])', delta, '  '),
    '}',
    '',
    block(':root[data-appshell-theme="dark"]', delta, ''),
    '',
  ].join('\n');
};

/**
 * Resolve and emit in one step. The authoring path — a preset name in hand, CSS wanted.
 * The registry uses `cssFrom` against a stored theme instead, so what it renders cannot
 * drift from what was published.
 */
export const toCss = (selection: ThemeSelection): string =>
  cssFrom(resolveTheme(selection), { colorScheme: selection.colorScheme });
