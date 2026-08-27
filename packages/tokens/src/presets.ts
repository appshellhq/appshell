/*
 * GENERATED from the palette script — do not hand-edit values.
 *
 * Every text pair here clears WCAG AA (4.5:1) in every base/mode/accent combination,
 * and every focus ring clears 3:1 against its surface. The generator refuses to emit
 * anything that does not.
 */
import type { AccentTokens, BaseTokens, Mode } from './contract';

export const BASES: Record<string, Record<Mode, BaseTokens>> = {
  neutral: {
    light: {
      'surface': 'oklch(99.0% 0.000 0.0)',
      'on-surface': 'oklch(21.0% 0.000 0.0)',
      'surface-raised': 'oklch(96.5% 0.000 0.0)',
      'on-surface-raised': 'oklch(21.0% 0.000 0.0)',
      'text-muted': 'oklch(50.0% 0.000 0.0)',
      'border': 'oklch(90.0% 0.000 0.0)',
      'danger': 'oklch(57.7% 0.215 27.3)',
      'on-danger': 'oklch(98.5% 0.000 89.9)',
      'warning': 'oklch(55.5% 0.146 49.0)',
      'on-warning': 'oklch(98.5% 0.000 89.9)',
      'success': 'oklch(50.8% 0.105 165.6)',
      'on-success': 'oklch(98.5% 0.000 89.9)',
    },
    dark: {
      'surface': 'oklch(18.0% 0.000 0.0)',
      'on-surface': 'oklch(95.0% 0.000 0.0)',
      'surface-raised': 'oklch(23.0% 0.000 0.0)',
      'on-surface-raised': 'oklch(95.0% 0.000 0.0)',
      'text-muted': 'oklch(68.0% 0.000 0.0)',
      'border': 'oklch(32.0% 0.000 0.0)',
      'danger': 'oklch(71.1% 0.166 22.2)',
      'on-danger': 'oklch(17.9% 0.006 285.8)',
      'warning': 'oklch(83.7% 0.164 84.4)',
      'on-warning': 'oklch(17.9% 0.006 285.8)',
      'success': 'oklch(77.3% 0.153 163.2)',
      'on-success': 'oklch(17.9% 0.006 285.8)',
    },
  },
  midnight: {
    light: {
      'surface': 'oklch(100.0% 0.000 89.9)',
      'on-surface': 'oklch(21.0% 0.006 285.9)',
      'surface-raised': 'oklch(96.7% 0.001 286.4)',
      'on-surface-raised': 'oklch(21.0% 0.006 285.9)',
      'text-muted': 'oklch(47.4% 0.013 285.9)',
      'border': 'oklch(92.0% 0.004 286.3)',
      'danger': 'oklch(57.7% 0.215 27.3)',
      'on-danger': 'oklch(98.5% 0.000 89.9)',
      'warning': 'oklch(55.5% 0.146 49.0)',
      'on-warning': 'oklch(98.5% 0.000 89.9)',
      'success': 'oklch(50.8% 0.105 165.6)',
      'on-success': 'oklch(98.5% 0.000 89.9)',
    },
    dark: {
      'surface': 'oklch(14.1% 0.004 285.8)',
      'on-surface': 'oklch(94.5% 0.007 286.3)',
      'surface-raised': 'oklch(18.9% 0.010 285.4)',
      'on-surface-raised': 'oklch(94.5% 0.007 286.3)',
      'text-muted': 'oklch(64.0% 0.015 286.0)',
      'border': 'oklch(27.6% 0.013 285.5)',
      'danger': 'oklch(71.1% 0.166 22.2)',
      'on-danger': 'oklch(17.9% 0.006 285.8)',
      'warning': 'oklch(83.7% 0.164 84.4)',
      'on-warning': 'oklch(17.9% 0.006 285.8)',
      'success': 'oklch(77.3% 0.153 163.2)',
      'on-success': 'oklch(17.9% 0.006 285.8)',
    },
  },
};

/* Each accent picks its own `on-` colour. A bright accent wants dark text and a deep
 * one wants light text — assuming white would fail AA on half of these. */
export const ACCENTS: Record<string, AccentTokens> = {
  ice: {
    'primary': 'oklch(68.5% 0.148 237.3)',
    'on-primary': 'oklch(17.9% 0.006 285.8)',
    'secondary': 'oklch(76.9% 0.165 70.1)',
    'on-secondary': 'oklch(17.9% 0.006 285.8)',
  },
  ember: {
    'primary': 'oklch(57.7% 0.215 27.3)',
    'on-primary': 'oklch(98.5% 0.000 89.9)',
    'secondary': 'oklch(68.5% 0.148 237.3)',
    'on-secondary': 'oklch(17.9% 0.006 285.8)',
  },
  emerald: {
    'primary': 'oklch(69.6% 0.149 162.5)',
    'on-primary': 'oklch(17.9% 0.006 285.8)',
    'secondary': 'oklch(76.9% 0.165 70.1)',
    'on-secondary': 'oklch(17.9% 0.006 285.8)',
  },
  violet: {
    'primary': 'oklch(51.1% 0.230 277.0)',
    'on-primary': 'oklch(98.5% 0.000 89.9)',
    'secondary': 'oklch(76.9% 0.165 70.1)',
    'on-secondary': 'oklch(17.9% 0.006 285.8)',
  },
  steel: {
    'primary': 'oklch(44.2% 0.015 285.8)',
    'on-primary': 'oklch(98.5% 0.000 89.9)',
    'secondary': 'oklch(76.9% 0.165 70.1)',
    'on-secondary': 'oklch(17.9% 0.006 285.8)',
  },
};

/* Focus rings keep the accent hue and chroma; only lightness moves, and only far
 * enough to clear 3:1 against that particular surface. Defaulting the ring to the
 * accent itself fails on 7 of these 20 combinations. */
export const FOCUS_RINGS: Record<string, Record<string, Record<Mode, string>>> = {
  neutral: {
    ice: {
      light: 'oklch(64.5% 0.148 237.3)',
      dark: 'oklch(68.5% 0.148 237.3)',
    },
    ember: {
      light: 'oklch(57.7% 0.215 27.3)',
      dark: 'oklch(57.7% 0.215 27.3)',
    },
    emerald: {
      light: 'oklch(63.6% 0.149 162.5)',
      dark: 'oklch(69.6% 0.149 162.5)',
    },
    violet: {
      light: 'oklch(51.1% 0.230 277.0)',
      dark: 'oklch(53.1% 0.230 277.0)',
    },
    steel: {
      light: 'oklch(44.2% 0.015 285.8)',
      dark: 'oklch(50.2% 0.015 285.8)',
    },
  },
  midnight: {
    ice: {
      light: 'oklch(64.5% 0.148 237.3)',
      dark: 'oklch(68.5% 0.148 237.3)',
    },
    ember: {
      light: 'oklch(57.7% 0.215 27.3)',
      dark: 'oklch(57.7% 0.215 27.3)',
    },
    emerald: {
      light: 'oklch(63.6% 0.149 162.5)',
      dark: 'oklch(69.6% 0.149 162.5)',
    },
    violet: {
      light: 'oklch(51.1% 0.230 277.0)',
      dark: 'oklch(51.1% 0.230 277.0)',
    },
    steel: {
      light: 'oklch(44.2% 0.015 285.8)',
      dark: 'oklch(48.2% 0.015 285.8)',
    },
  },
};
