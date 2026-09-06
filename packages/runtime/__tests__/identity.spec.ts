/**
 * @jest-environment jsdom
 */
/* eslint-disable no-underscore-dangle, @typescript-eslint/naming-convention */
import { ANONYMOUS, getIdentity, type Identity } from '../src/identity';

const inlined = (value: unknown) => {
  (window as unknown as Record<string, unknown>).__appshell_identity__ = value;
};

describe('getIdentity', () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__appshell_identity__;
  });

  it('is anonymous when the registry inlined nothing', () => {
    expect(getIdentity()).toEqual(ANONYMOUS);
  });

  it('returns the visitor the registry inlined', () => {
    inlined({ authenticated: true, subject: 'a1b2', username: 'rh', roles: ['publisher'] });

    expect(getIdentity()).toEqual({
      authenticated: true,
      subject: 'a1b2',
      username: 'rh',
      roles: ['publisher'],
    });
  });

  it('returns the anonymous identity the registry inlined', () => {
    inlined({ authenticated: false });

    expect(getIdentity()).toEqual(ANONYMOUS);
  });

  describe('is anonymous rather than trusting a shape it does not recognise', () => {
    it.each([
      ['a string', 'rh'],
      ['null', null],
      ['an array', []],
      ['authenticated with no subject', { authenticated: true, username: 'rh', roles: [] }],
      ['authenticated with no username', { authenticated: true, subject: 'a1b2', roles: [] }],
      [
        'authenticated with non-array roles',
        { authenticated: true, subject: 'a', username: 'b', roles: 'admin' },
      ],
      [
        'authenticated as a string',
        { authenticated: 'true', subject: 'a', username: 'b', roles: [] },
      ],
      ['an object with no discriminant', { subject: 'a1b2' }],
    ])('%s', (_case, value) => {
      inlined(value);

      expect(getIdentity()).toEqual(ANONYMOUS);
    });
  });

  /**
   * The narrowing property — that `username` cannot be read before the anonymous
   * case is handled — is asserted with @ts-expect-error in appshell-services,
   * where CI runs `tsc --noEmit` over specs.
   *
   * It is deliberately NOT asserted here. This repo's typecheck covers only
   * `./src`, so a deliberate type error in a spec passes — verified rather than
   * assumed. A directive that can never fail reads as coverage while proving
   * nothing, which is worse than leaving the gap visible.
   */
  it('narrows at runtime as the union describes', () => {
    inlined({ authenticated: true, subject: 'a1b2', username: 'rh', roles: [] });

    const identity: Identity = getIdentity();

    expect(identity.authenticated && identity.username).toBe('rh');
  });
});
