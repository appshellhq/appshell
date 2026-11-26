/**
 * What each role's value may be.
 *
 * A theme ends up inlined into every page the registry serves, inside a `<style>` element, as
 * `--appshell-<role>: <value>;`. So a value is a way into the page, not only into the CSS: one
 * carrying `;}` adds rules of its own, and one carrying `</style>` closes the element and writes
 * markup. Contrast checking never sees most roles — type, dimensions, and the colours no pair
 * measures — so each value is checked against a grammar for its role instead. The grammars are
 * deliberately narrow: what the presets use, and the plain CSS an author would write for each
 * role. Widening one later refuses nothing already accepted; narrowing one would.
 */
import {
  ACCENT_COLOR_ROLES,
  BASE_COLOR_ROLES,
  DERIVED_COLOR_ROLES,
  DIMENSION_ROLES,
  TYPE_ROLES,
  type TokenRole,
} from './contract';
import { parseColor } from './contrast';

export type ValueKind = 'colour' | 'font-family' | 'length' | 'line-height';

const KINDS: ReadonlyMap<string, ValueKind> = new Map<string, ValueKind>([
  ...[...BASE_COLOR_ROLES, ...ACCENT_COLOR_ROLES, ...DERIVED_COLOR_ROLES].map(
    (role) => [role, 'colour'] as const,
  ),
  ['font-body', 'font-family'],
  ['font-mono', 'font-family'],
  ['line-height-tight', 'line-height'],
  ['line-height-normal', 'line-height'],
  ...TYPE_ROLES.filter((role) => role.startsWith('font-size-')).map(
    (role) => [role, 'length'] as const,
  ),
  ...DIMENSION_ROLES.map((role) => [role, 'length'] as const),
]);

/** The kind of value a role takes. Every role in the contract has one. */
export const valueKindOf = (role: TokenRole): ValueKind => KINDS.get(role) as ValueKind;

/** Far longer than any real value, short enough that no theme can bloat every page it's in. */
export const MAX_VALUE_LENGTH = 256;

/**
 * Refused in any value, whatever its role: each can end a declaration, a rule or the element the
 * theme is inlined in, or hide what follows. A backstop under the grammars, and the reason a
 * finding gives when it applies, since "not a length" undersells `</style>`.
 */
// eslint-disable-next-line no-control-regex
const UNSAFE = /[<>{};\\\u0000-\u001f\u007f\u2028\u2029]/;

const NUMBER = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;

const UNITS = [
  'px',
  'rem',
  'em',
  'ex',
  'ch',
  'lh',
  'rlh',
  'cap',
  'ic',
  'vw',
  'vh',
  'vi',
  'vb',
  'vmin',
  'vmax',
  'svw',
  'svh',
  'lvw',
  'lvh',
  'dvw',
  'dvh',
  'cqw',
  'cqh',
  'cqi',
  'cqb',
  'cqmin',
  'cqmax',
  'pt',
  'pc',
  'cm',
  'mm',
  'q',
  'in',
  '%',
];

/** A length or a percentage. Unsigned: no size, space or radius is negative. */
const LENGTH = new RegExp(String.raw`^(?:0|${NUMBER}(?:${UNITS.join('|')}))$`, 'i');

const LINE_HEIGHT = new RegExp(String.raw`^(?:normal|${NUMBER})$`, 'i');

/** A family name: quoted, or one or more identifiers, as `Segoe UI` may be written either way. */
const IDENT = String.raw`-{0,2}[\p{L}_][\p{L}\p{N}_-]*`;
const FAMILY = String.raw`(?:'[^']+'|"[^"]+"|${IDENT}(?:\s+${IDENT})*)`;
const FONT_FAMILY = new RegExp(String.raw`^${FAMILY}(?:\s*,\s*${FAMILY})*$`, 'u');

const COLOUR_ROLES: ReadonlySet<string> = new Set(
  [...KINDS].filter(([, kind]) => kind === 'colour').map(([role]) => role),
);

const KEYWORD = /^(?:white|black|transparent|currentcolor)$/i;
const ROLE_REFERENCE = /^var\(\s*--appshell-([a-z-]+)\s*\)$/;

/**
 * One colour: a value `parseColor` reads, another colour role, or a keyword. Contrast can only
 * measure the first, and says so for a measured role given anything else.
 */
const isColour = (value: string): boolean => {
  if (KEYWORD.test(value) || parseColor(value)) return true;

  const reference = ROLE_REFERENCE.exec(value);

  return Boolean(reference && COLOUR_ROLES.has(reference[1]));
};

const SPACE = /^(?:oklch|oklab|srgb|srgb-linear|display-p3|lab|lch|hsl|hwb|xyz)$/i;
const COLOR_MIX = /^color-mix\(\s*in\s+([a-z0-9-]+)\s*,([^,]+),([^,]+)\)$/i;
const MIX_PART = new RegExp(String.raw`^(.+?)(?:\s+(${NUMBER})%)?$`);

/**
 * `color-mix(in oklch, var(--appshell-primary), white 12%)`, as hover and active are derived.
 * Each weight is 0–100%, and two can't both be zero, or CSS throws the declaration away.
 */
const isColorMix = (value: string): boolean => {
  const mix = COLOR_MIX.exec(value);

  if (!mix || !SPACE.test(mix[1])) return false;

  const parts = [mix[2], mix[3]].map((part) => MIX_PART.exec(part.trim()));
  const weights = parts.map((part) => (part?.[2] === undefined ? undefined : Number(part[2])));

  return (
    parts.every((part) => part && isColour(part[1])) &&
    weights.every((weight) => weight === undefined || weight <= 100) &&
    !(weights[0] === 0 && weights[1] === 0)
  );
};

const VALID: Record<ValueKind, (value: string) => boolean> = {
  colour: (value) => isColour(value) || isColorMix(value),
  'font-family': (value) => FONT_FAMILY.test(value),
  length: (value) => LENGTH.test(value),
  'line-height': (value) => LINE_HEIGHT.test(value) || LENGTH.test(value),
};

export type ValueFinding = {
  /** As written, which may not be a role at all. */
  role: string;
  reason: 'unknown-role' | 'not-a-string' | 'too-long' | 'unsafe' | 'invalid';
};

/**
 * Every finding for a set of values, keyed by role: a whole mode of a theme, or the overrides an
 * application lays over one. Empty means each value is one its role can take, and none can leave
 * the declaration it's written into. At most one finding per role.
 *
 * Contrast is `validateTheme`'s, and only meaningful once these pass.
 */
export const validateValues = (values: Record<string, unknown>): ValueFinding[] =>
  Object.entries(values).flatMap(([role, value]): ValueFinding[] => {
    const kind = KINDS.get(role);

    if (!kind) return [{ role, reason: 'unknown-role' }];
    if (typeof value !== 'string') return [{ role, reason: 'not-a-string' }];
    if (value.length > MAX_VALUE_LENGTH) return [{ role, reason: 'too-long' }];
    if (UNSAFE.test(value)) return [{ role, reason: 'unsafe' }];

    return VALID[kind](value.trim()) ? [] : [{ role, reason: 'invalid' }];
  });

const EXPECTED: Record<ValueKind, string> = {
  colour:
    'a colour: #rgb, #rrggbb, oklch(L% C H), another colour role as var(--appshell-<role>), ' +
    'or a color-mix() of those',
  'font-family': "a list of font families, such as system-ui, 'Segoe UI', sans-serif",
  length: 'a length or percentage, such as 1rem, 12px or 50%',
  'line-height': 'a number, such as 1.5, or a length',
};

/** A role's name, or what could be one: lowercase words and hyphens. */
const ROLE_NAME = /^[a-z0-9-]{1,64}$/;

/**
 * A sentence for a finding. It names the role and never echoes the value, and names a key that
 * isn't a role only if it looks like one, so what a publisher sent can't put markup or a
 * terminal's control codes into the message about it.
 */
export const describeValueFinding = ({ role, reason }: ValueFinding): string => {
  const kind = KINDS.get(role);

  switch (reason) {
    case 'unknown-role':
      return ROLE_NAME.test(role)
        ? `'${role}' is not a role in the token contract.`
        : 'A key is not a role in the token contract: roles are lowercase words and hyphens.';
    case 'not-a-string':
      return `${role}: the value must be a string.`;
    case 'too-long':
      return `${role}: the value is longer than ${MAX_VALUE_LENGTH} characters.`;
    case 'unsafe':
      return `${role}: the value contains a character no token value may: < > { } ; \\ or a control character.`;
    default:
      return `${role}: expected ${kind ? EXPECTED[kind] : 'a value'}.`;
  }
};
