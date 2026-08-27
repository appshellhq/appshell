/**
 * The token contract: the complete, fixed vocabulary a package may consume and an
 * Application must supply.
 *
 * Small and stable is the property that matters. A package authors against these names
 * with fallbacks (`var(--appshell-primary, #0af)`) and renders standalone; an Application
 * supplies the values and every package it composes moves together.
 */

export type Mode = 'light' | 'dark';

/** Colour roles an Application's *base* supplies — everything not tied to the accent. */
export const BASE_COLOR_ROLES = [
  'surface',
  'on-surface',
  'surface-raised',
  'on-surface-raised',
  'text-muted',
  'border',
  'danger',
  'on-danger',
  'warning',
  'on-warning',
  'success',
  'on-success',
] as const;

/** Colour roles an Application's *accent* supplies. */
export const ACCENT_COLOR_ROLES = ['primary', 'on-primary', 'secondary', 'on-secondary'] as const;

/**
 * Derived rather than authored. Hover and active are computed from their accent with
 * `color-mix`, and the focus ring is picked per base+accent so it stays visible. A theme
 * may override any of them; none has to be supplied.
 */
export const DERIVED_COLOR_ROLES = [
  'primary-hover',
  'primary-active',
  'secondary-hover',
  'secondary-active',
  'focus-ring',
] as const;

/**
 * Named for their role, not their size. A numeric scale would reintroduce exactly the
 * divergence this contract exists to prevent — one author mapping `h1` to `2xl` and
 * another to `xl` is how headings stop matching across a composed page.
 */
export const TYPE_ROLES = [
  'font-body',
  'font-mono',
  'font-size-h1',
  'font-size-h2',
  'font-size-h3',
  'font-size-h4',
  'font-size-h5',
  'font-size-h6',
  'font-size-body',
  'font-size-small',
  'line-height-tight',
  'line-height-normal',
] as const;

/** Genuinely a scale. Nobody wants `--appshell-space-card-padding`. */
export const DIMENSION_ROLES = [
  'space-xs',
  'space-sm',
  'space-md',
  'space-lg',
  'space-xl',
  'radius-sm',
  'radius-md',
  'radius-lg',
] as const;

export type BaseColorRole = (typeof BASE_COLOR_ROLES)[number];
export type AccentColorRole = (typeof ACCENT_COLOR_ROLES)[number];
export type DerivedColorRole = (typeof DERIVED_COLOR_ROLES)[number];
export type TypeRole = (typeof TYPE_ROLES)[number];
export type DimensionRole = (typeof DIMENSION_ROLES)[number];

export type TokenRole =
  | BaseColorRole
  | AccentColorRole
  | DerivedColorRole
  | TypeRole
  | DimensionRole;

export const TOKEN_ROLES: readonly TokenRole[] = [
  ...BASE_COLOR_ROLES,
  ...ACCENT_COLOR_ROLES,
  ...DERIVED_COLOR_ROLES,
  ...TYPE_ROLES,
  ...DIMENSION_ROLES,
];

export type BaseTokens = Record<BaseColorRole, string>;
export type AccentTokens = Record<AccentColorRole, string>;
export type Theme = Record<TokenRole, string>;

/** The custom property a role is published as. */
export const cssVar = (role: TokenRole): string => `--appshell-${role}`;

/**
 * Pairs the registry checks for contrast. Because every role that carries text has an
 * `on-` partner, a theme cannot express illegible text without failing this list — which
 * is the failure that actually reaches users, and the one a CSS parser alone never catches.
 */
export const TEXT_PAIRS: readonly (readonly [TokenRole, TokenRole])[] = [
  ['surface', 'on-surface'],
  ['surface-raised', 'on-surface-raised'],
  ['primary', 'on-primary'],
  ['secondary', 'on-secondary'],
  ['danger', 'on-danger'],
  ['warning', 'on-warning'],
  ['success', 'on-success'],
];

/** Muted text has no `on-` partner; it is read against both surfaces. */
export const MUTED_AGAINST: readonly TokenRole[] = ['surface', 'surface-raised'];

/** Non-text, so 3:1 rather than 4.5:1 — WCAG 1.4.11. */
export const NON_TEXT_PAIRS: readonly (readonly [TokenRole, TokenRole])[] = [
  ['surface', 'focus-ring'],
];

export const AA_TEXT = 4.5;
export const AA_NON_TEXT = 3;
