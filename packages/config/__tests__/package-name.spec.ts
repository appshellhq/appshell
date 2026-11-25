import { packageScope, parsePackageName } from '../src/package-name';

/*
 * Three places used to strip the scope with their own copy of the same regex. A rule
 * about where a package publishes to, held in three copies, is three chances to disagree.
 */
describe('parsePackageName', () => {
  it('splits a scoped name into where it belongs and what it is called', () => {
    expect(parsePackageName('@acme/checkout')).toEqual({ scopeId: 'acme', name: 'checkout' });
  });

  it('leaves an unscoped name without a scope', () => {
    expect(parsePackageName('checkout')).toEqual({ name: 'checkout' });
  });

  /* npm allows a slash only after a scope, so the rest of the name is taken whole. */
  it('keeps the whole name after the scope', () => {
    expect(parsePackageName('@acme/ui-kit.v2')).toEqual({ scopeId: 'acme', name: 'ui-kit.v2' });
  });

  it('does not treat a bare at-sign as a scope', () => {
    expect(parsePackageName('@acme')).toEqual({ name: '@acme' });
  });
});

/*
 * One rule for where a package publishes and overlays. Publishing used to ignore the default
 * scope, so an unqualified package went to the publisher's own scope and was looked for in
 * the default one (appshellhq/appshell-services#125).
 */
describe('packageScope', () => {
  it('takes the scope the package declares over the default', () => {
    expect(packageScope('acme', 'mine')).toBe('acme');
  });

  it('takes the default scope for an unscoped package', () => {
    expect(packageScope(undefined, 'acme')).toBe('acme');
  });

  it('is none without either, for the registry to use the publisher’s own', () => {
    expect(packageScope(undefined, undefined)).toBeUndefined();
    expect(packageScope('', '')).toBeUndefined();
  });
});
