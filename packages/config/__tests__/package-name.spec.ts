import { parsePackageName } from '../src/package-name';

/*
 * Three places used to strip the scope with their own copy of the same regex. A rule
 * about where a package publishes to, held in three copies, is three chances to disagree.
 */
describe('parsePackageName', () => {
  it('splits a scoped name into where it belongs and what it is called', () => {
    expect(parsePackageName('@acme/checkout')).toEqual({ scopeId: 'acme', name: 'checkout' });
  });

  it('leaves an unscoped name to belong wherever the publisher does', () => {
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
