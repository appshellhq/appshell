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
  // A level below the page, for its chrome: a sidebar, a navigation rail, an inset panel.
  'surface-sunken',
  'on-surface-sunken',
  'surface-raised',
  'on-surface-raised',
  'text-muted',
  // A divider's edge, which nothing needs to see to use the page.
  'border',
  // A control's edge, which is how it's found: a field, a select, an outlined button.
  'border-control',
  'danger',
  'on-danger',
  'warning',
  'on-warning',
  'success',
  'on-success',
  'info',
  'on-info',
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
  ['surface-sunken', 'on-surface-sunken'],
  ['surface-raised', 'on-surface-raised'],
  ['primary', 'on-primary'],
  ['secondary', 'on-secondary'],
  ['danger', 'on-danger'],
  ['warning', 'on-warning'],
  ['success', 'on-success'],
  ['info', 'on-info'],
];

/** The surfaces text is put on. */
export const SURFACES: readonly TokenRole[] = ['surface', 'surface-sunken', 'surface-raised'];

/**
 * Colours that are also text with no `on-` partner of their own, so each is read against every
 * surface: muted text, and a status used as text (an error under a field, a warning icon). A
 * status that passes as a fill can still fail as text — amber on white is the classic case.
 */
export const TEXT_ON_SURFACES: readonly TokenRole[] = [
  'text-muted',
  'danger',
  'warning',
  'success',
  'info',
];

/**
 * Non-text, so 3:1 rather than 4.5:1 — WCAG 1.4.11. The focus ring and a control's border are
 * checked on every surface, because focus lands in a dialog and a sidebar as well as on the
 * page, and a control's border is how it's found. `border` isn't checked, because a divider
 * isn't needed to use the page.
 */
export const NON_TEXT_PAIRS: readonly (readonly [TokenRole, TokenRole])[] = SURFACES.flatMap(
  (surface) => [[surface, 'focus-ring'] as const, [surface, 'border-control'] as const],
);

export const AA_TEXT = 4.5;
export const AA_NON_TEXT = 3;
