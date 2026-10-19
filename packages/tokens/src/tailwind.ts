/**
 * The contract under Tailwind v4's names, so a package written with Tailwind's utilities
 * (`bg-primary`, `text-on-surface`, `rounded-md`, `text-h2`, `p-md`) paints with the
 * Application's theme. Published as `@appshell/tokens/tailwind.css`, which the build emits
 * from this table: a role added to the contract without a name here is a type error, so the
 * adapter can't fall behind the contract.
 */

import { TOKEN_ROLES, cssVar, type TokenRole } from './contract';

/**
 * Colours are `--color-<role>`, so the utilities read as the roles do. The rest take the
 * Tailwind name for what they are: families are `--font-*`, sizes `--text-*`, line heights
 * `--leading-*`, the space scale `--spacing-*` and radii `--radius-*`.
 */
export const TAILWIND_NAMES: Readonly<Record<TokenRole, string>> = {
  surface: '--color-surface',
  'on-surface': '--color-on-surface',
  'surface-sunken': '--color-surface-sunken',
  'on-surface-sunken': '--color-on-surface-sunken',
  'surface-raised': '--color-surface-raised',
  'on-surface-raised': '--color-on-surface-raised',
  // `text-muted` reads as one utility, not `text-text-muted`.
  'text-muted': '--color-muted',
  border: '--color-border',
  // Likewise `border-control`, not `border-border-control`.
  'border-control': '--color-control',
  danger: '--color-danger',
  'on-danger': '--color-on-danger',
  warning: '--color-warning',
  'on-warning': '--color-on-warning',
  success: '--color-success',
  'on-success': '--color-on-success',
  info: '--color-info',
  'on-info': '--color-on-info',

  primary: '--color-primary',
  'on-primary': '--color-on-primary',
  secondary: '--color-secondary',
  'on-secondary': '--color-on-secondary',

  'primary-hover': '--color-primary-hover',
  'primary-active': '--color-primary-active',
  'secondary-hover': '--color-secondary-hover',
  'secondary-active': '--color-secondary-active',
  'focus-ring': '--color-focus-ring',

  // Tailwind's `font-sans` is the body family, and what its own defaults build on.
  'font-body': '--font-sans',
  'font-mono': '--font-mono',
  'font-size-h1': '--text-h1',
  'font-size-h2': '--text-h2',
  'font-size-h3': '--text-h3',
  'font-size-h4': '--text-h4',
  'font-size-h5': '--text-h5',
  'font-size-h6': '--text-h6',
  'font-size-body': '--text-body',
  'font-size-small': '--text-small',
  'line-height-tight': '--leading-tight',
  'line-height-normal': '--leading-normal',

  'space-xs': '--spacing-xs',
  'space-sm': '--spacing-sm',
  'space-md': '--spacing-md',
  'space-lg': '--spacing-lg',
  'space-xl': '--spacing-xl',
  'radius-sm': '--radius-sm',
  'radius-md': '--radius-md',
  'radius-lg': '--radius-lg',
};

const HEADER = `/*
 * @appshell/tokens/tailwind.css: the Appshell token contract under Tailwind v4's names.
 * Generated from @appshell/tokens; do not edit.
 *
 * Import it after any defaults of your own, so the Application's theme wins:
 *
 *   @layer theme, base, components, utilities;
 *   @import "tailwindcss/theme.css" layer(theme);
 *   @import "tailwindcss/utilities.css" layer(utilities);
 *   @import "@appshell/tokens/tailwind.css";
 *   @source "../dist";
 *
 * No preflight: the shell owns the page's one reset. And an @source of your own, naming the
 * directory your markup is compiled to: Tailwind generates a utility only for a class it
 * finds written down, and skips a gitignored path under a glob.
 */`;

/** The adapter's stylesheet: one theme variable per role, each the role's custom property. */
export const tailwindCss = (): string =>
  [
    HEADER,
    '@theme {',
    ...TOKEN_ROLES.map((role) => `  ${TAILWIND_NAMES[role]}: var(${cssVar(role)});`),
    '}',
    '',
  ].join('\n');
