import {
  ACCENTS,
  BASES,
  TOKEN_ROLES,
  composeTheme,
  contrastRatio,
  describeFinding,
  parseColor,
  toCss,
  validateTheme,
  type Mode,
} from '@appshell/tokens';

const MODES: Mode[] = ['light', 'dark'];
const combinations = Object.keys(BASES).flatMap((base) =>
  Object.keys(ACCENTS).flatMap((accent) => MODES.map((mode) => ({ base, accent, mode }))),
);

describe('contract', () => {
  it('should publish 41 roles', () => {
    expect(TOKEN_ROLES).toHaveLength(41);
  });

  it('should not repeat a role across groups', () => {
    expect(new Set(TOKEN_ROLES).size).toBe(TOKEN_ROLES.length);
  });
});

describe('colour', () => {
  const rgb = (value: string) => {
    const parsed = parseColor(value);
    if (!parsed) throw new Error(`expected '${value}' to parse`);

    return parsed;
  };

  it('should measure white against black as 21:1', () => {
    expect(contrastRatio(rgb('#ffffff'), rgb('#000000'))).toBeCloseTo(21, 1);
  });

  it('should read oklch and hex as the same colour', () => {
    const viaHex = rgb('#0ea5e9');

    rgb('oklch(68.5% 0.148 237.3)').forEach((channel, i) =>
      expect(channel).toBeCloseTo(viaHex[i], 1),
    );
  });

  it('should report a value it cannot measure rather than throwing', () => {
    expect(parseColor('bananas')).toBeUndefined();
  });
});

describe('presets', () => {
  // The presets have to pass the validation the contract imposes on everyone else.
  it.each(combinations)('should pass contrast: $base / $accent / $mode', ({ base, accent, mode }) => {
    const findings = validateTheme(composeTheme({ base, accent }, mode));

    expect(findings.map(describeFinding)).toEqual([]);
  });

  it('should reject an unknown base by name', () => {
    expect(() => composeTheme({ base: 'nope', accent: 'ice' }, 'light')).toThrow(/Unknown base/i);
  });

  it('should list what is available when an accent is unknown', () => {
    expect(() => composeTheme({ base: 'neutral', accent: 'nope' }, 'light')).toThrow(/ice/);
  });
});

describe('composeTheme', () => {
  it('should supply every role in the contract', () => {
    const theme = composeTheme({ base: 'neutral', accent: 'ice' }, 'light');

    TOKEN_ROLES.forEach((role) => expect(theme[role]).toBeTruthy());
  });

  it('should let overrides win over the preset', () => {
    const theme = composeTheme(
      { base: 'neutral', accent: 'ice', overrides: { primary: 'oklch(50% 0.2 300)' } },
      'light',
    );

    expect(theme.primary).toBe('oklch(50% 0.2 300)');
  });

  // A ring that is only the accent disappears against some surfaces.
  it('should not simply reuse the accent as the focus ring where that would fail', () => {
    const theme = composeTheme({ base: 'neutral', accent: 'ice' }, 'light');

    expect(theme['focus-ring']).not.toBe(theme.primary);
  });

  it('should flip the hover direction between modes', () => {
    const light = composeTheme({ base: 'neutral', accent: 'ice' }, 'light');
    const dark = composeTheme({ base: 'neutral', accent: 'ice' }, 'dark');

    expect(light['primary-hover']).toContain('black');
    expect(dark['primary-hover']).toContain('white');
  });
});

describe('toCss', () => {
  const css = toCss({ base: 'midnight', accent: 'ice' });

  it('should emit all three mode states', () => {
    expect(css).toContain(':root {');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(':root[data-appshell-theme="dark"]');
  });

  it('should let an explicit light choice survive the media query', () => {
    expect(css).toContain(':root:not([data-appshell-theme="light"])');
  });

  it('should namespace every custom property', () => {
    const declarations = css.match(/^\s+--[a-z-]+:/gm) ?? [];

    expect(declarations.length).toBeGreaterThan(0);
    declarations.forEach((d) => expect(d.trim()).toMatch(/^--appshell-/));
  });
});

describe('toCss size', () => {
  const css = toCss({ base: 'midnight', accent: 'ice' });

  // This block is inlined into every page the registry serves.
  it('should not repeat tokens that do not vary by mode', () => {
    expect(css.match(/--appshell-font-size-h1:/g)).toHaveLength(1);
    expect(css.match(/--appshell-space-md:/g)).toHaveLength(1);
  });

  it('should still restate every role that does vary', () => {
    const dark = css.slice(css.indexOf('@media'));

    expect(dark).toContain('--appshell-surface:');
    expect(dark).toContain('--appshell-on-surface:');
  });
});
