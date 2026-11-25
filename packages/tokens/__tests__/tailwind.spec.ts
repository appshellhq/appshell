import {
  ACCENT_COLOR_ROLES,
  BASE_COLOR_ROLES,
  DERIVED_COLOR_ROLES,
  DIMENSION_ROLES,
  TAILWIND_NAMES,
  TOKEN_ROLES,
  TYPE_ROLES,
  cssVar,
  tailwindCss,
} from '@appshell/tokens';

describe('the Tailwind adapter', () => {
  it('names every role in the contract, and nothing else', () => {
    expect(Object.keys(TAILWIND_NAMES).sort()).toEqual([...TOKEN_ROLES].sort());
  });

  it('gives no two roles the same Tailwind name', () => {
    const names = Object.values(TAILWIND_NAMES);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each([
    ['colour', [...BASE_COLOR_ROLES, ...ACCENT_COLOR_ROLES, ...DERIVED_COLOR_ROLES], /^--color-/],
    ['type', TYPE_ROLES, /^--(font|text|leading)-/],
    ['dimension', DIMENSION_ROLES, /^--(spacing|radius)-/],
  ] as const)('puts each %s role in its Tailwind namespace', (_group, roles, namespace) => {
    roles.forEach((role) => expect(TAILWIND_NAMES[role]).toMatch(namespace));
  });

  it('emits one theme variable per role, in the contract order, each its custom property', () => {
    const declarations = tailwindCss().match(/^ {2}--[a-z0-9-]+: .+;$/gm) ?? [];

    expect(declarations).toEqual(
      TOKEN_ROLES.map((role) => `  ${TAILWIND_NAMES[role]}: var(${cssVar(role)});`),
    );
  });

  it('is a single @theme block with no values of its own', () => {
    const css = tailwindCss();
    const body = css.slice(css.indexOf('@theme {'));

    expect(css.match(/@theme \{/g)).toHaveLength(1);
    expect(body).not.toMatch(/#[0-9a-f]{3,8}\b|oklch\(|rgb\(|\b\d+(\.\d+)?(px|rem|em)\b/i);
  });
});
