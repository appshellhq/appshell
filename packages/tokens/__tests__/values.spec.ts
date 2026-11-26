import {
  ACCENTS,
  BASES,
  MAX_VALUE_LENGTH,
  TOKEN_ROLES,
  describeValueFinding,
  resolveTheme,
  validateValues,
  valueKindOf,
  type ValueFinding,
} from '@appshell/tokens';

/** The value appshell-services#122 found would publish, closing the theme's style element. */
const BREAKOUT =
  'system-ui;}</style><meta http-equiv="refresh" content="0;url=https://example.test">';

const findingFor = (role: string, value: unknown): ValueFinding | undefined =>
  validateValues({ [role]: value })[0];

describe('validateValues', () => {
  it('knows the kind of every role in the contract', () => {
    TOKEN_ROLES.forEach((role) => expect(valueKindOf(role)).toBeDefined());
  });

  it('accepts every preset, in both modes', () => {
    Object.keys(BASES).forEach((base) =>
      Object.keys(ACCENTS).forEach((accent) => {
        const resolved = resolveTheme({ base, accent });

        expect(validateValues(resolved.light)).toEqual([]);
        expect(validateValues(resolved.dark)).toEqual([]);
      }),
    );
  });

  describe.each([
    [
      'colour',
      'primary-hover',
      [
        '#0af',
        '#00aaff',
        'oklch(62% 0.19 255)',
        'white',
        'currentColor',
        'transparent',
        'var(--appshell-primary)',
        'color-mix(in oklch, var(--appshell-primary), white 12%)',
        'color-mix(in srgb, #0af 40%, oklch(20% 0.02 255))',
      ],
      [
        'bananas',
        'red',
        'rgb(0 0 0)',
        'url(https://example.test/x.png)',
        'var(--appshell-font-body)',
        'var(--elsewhere)',
        'color-mix(in nowhere, white, black)',
        'color-mix(in oklch, url(https://example.test), white)',
        '#0af !important',
      ],
    ],
    [
      'font-family',
      'font-body',
      [
        'system-ui',
        "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        '"Noto Sans JP", sans-serif',
        'Segoe UI, sans-serif',
        "'微软雅黑', sans-serif",
      ],
      [
        '',
        'system-ui,',
        "''",
        '8bit, sans-serif',
        'system-ui /* x */',
        'url(https://example.test/font.woff2)',
        'system-ui !important',
      ],
    ],
    [
      'length',
      'space-md',
      ['0', '1rem', '0.5rem', '.75em', '12px', '50%', '2vw', '1Q', '10cqi'],
      ['1', '-1rem', '1 rem', '1rem 2rem', 'calc(1rem + 2px)', 'auto', '1e3px', 'url(x)'],
    ],
    [
      'line-height',
      'line-height-normal',
      ['1.6', '1', 'normal', '24px', '1.5em', '150%'],
      ['-1', 'tall', '1.5 1.5', 'calc(1 + 1)'],
    ],
  ])('a %s role, such as %s', (_kind, role, accepted, refused) => {
    it.each(accepted)('accepts %p', (value) => expect(findingFor(role, value)).toBeUndefined());

    it.each(refused)('refuses %p, naming the role', (value) =>
      expect(findingFor(role, value)).toEqual({ role, reason: 'invalid' }),
    );

    it('refuses a value that closes the style element', () =>
      expect(findingFor(role, BREAKOUT)).toEqual({ role, reason: 'unsafe' }));

    it.each(['<', '>', '{', '}', ';', '\\', '\n', '\u0000', '\u007f', '\u2028'])(
      'refuses %p anywhere in the value',
      (character) =>
        expect(findingFor(role, `${accepted[0]}${character}`)).toEqual({
          role,
          reason: 'unsafe',
        }),
    );
  });

  it("refuses a font family's quoted name when it carries markup", () =>
    expect(findingFor('font-mono', "'</style>', monospace")).toEqual({
      role: 'font-mono',
      reason: 'unsafe',
    }));

  it('refuses a key that is not a role, whatever it carries', () => {
    expect(validateValues({ 'brand-glow': '#0af' })).toEqual([
      { role: 'brand-glow', reason: 'unknown-role' },
    ]);
    expect(validateValues(JSON.parse('{"__proto__": "#0af"}'))).toEqual([
      { role: '__proto__', reason: 'unknown-role' },
    ]);
    expect(validateValues({ 'x: 0;}</style><p>': '#0af' })).toEqual([
      { role: 'x: 0;}</style><p>', reason: 'unknown-role' },
    ]);
  });

  it('refuses a value that is not a string', () => {
    expect(findingFor('space-md', 4)).toEqual({ role: 'space-md', reason: 'not-a-string' });
    expect(findingFor('surface', { toString: () => '#fff' })).toEqual({
      role: 'surface',
      reason: 'not-a-string',
    });
  });

  it('refuses a value longer than any role needs', () => {
    const long = Array.from({ length: 40 }, (_, i) => `'Family ${i}'`).join(', ');

    expect(long.length).toBeGreaterThan(MAX_VALUE_LENGTH);
    expect(findingFor('font-body', long)).toEqual({ role: 'font-body', reason: 'too-long' });
  });

  it('gives one finding per role, for every role that has one', () => {
    expect(
      validateValues({ 'font-body': BREAKOUT, 'radius-md': 'round', surface: '#fff' }),
    ).toEqual([
      { role: 'font-body', reason: 'unsafe' },
      { role: 'radius-md', reason: 'invalid' },
    ]);
  });
});

describe('describeValueFinding', () => {
  it('names the role and what it takes', () => {
    expect(describeValueFinding({ role: 'space-md', reason: 'invalid' })).toBe(
      'space-md: expected a length or percentage, such as 1rem, 12px or 50%.',
    );
    expect(describeValueFinding({ role: 'font-body', reason: 'unsafe' })).toMatch(/^font-body: /);
  });

  it('never echoes the value', () => {
    const [finding] = validateValues({ 'font-body': BREAKOUT });

    expect(describeValueFinding(finding)).not.toMatch(/meta|example\.test/);
  });

  it("names a key that isn't a role only if it looks like one", () => {
    expect(describeValueFinding({ role: 'brand-glow', reason: 'unknown-role' })).toBe(
      "'brand-glow' is not a role in the token contract.",
    );

    const odd = describeValueFinding({ role: 'x;}</style>\u001b[2J', reason: 'unknown-role' });

    ['<', ';', '\u001b'].forEach((character) => expect(odd).not.toContain(character));
  });
});
