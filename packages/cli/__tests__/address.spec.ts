import { parseAddress, resolvePackage } from '../src/util/address';
import { resolveScopeId } from '../src/util/scope';

jest.mock('../src/util/scope', () => ({ resolveScopeId: jest.fn().mockResolvedValue('mine') }));

/*
 * Every command that takes a package name had its own parsing, and the copies disagreed:
 * five read `@acme/checkout` as scope `@acme`, and `unpublish`, `restore` and `purge` didn't
 * split at all, so `unpublish acme/checkout 1.0.0` addressed `acme/acme/checkout`. Found
 * cleaning up after appshellhq/appshell-services#33's end-to-end check, with the form publish
 * had just printed.
 */
describe('parseAddress', () => {
  it.each([
    ['checkout', { name: 'checkout' }],
    ['acme/checkout', { scopeId: 'acme', name: 'checkout' }],
    ['@acme/checkout', { scopeId: 'acme', name: 'checkout' }],
    ['checkout@1.2.3', { name: 'checkout', version: '1.2.3' }],
    ['acme/checkout@1.2.3', { scopeId: 'acme', name: 'checkout', version: '1.2.3' }],
    ['@acme/checkout@1.2.3', { scopeId: 'acme', name: 'checkout', version: '1.2.3' }],
    [
      'acme/checkout@1.0.0-alpha.1',
      { scopeId: 'acme', name: 'checkout', version: '1.0.0-alpha.1' },
    ],
  ])('reads %s', (raw, expected) => {
    expect(parseAddress(raw)).toEqual(expected);
  });

  it.each(['acme/checkout/extra', '@acme/checkout/extra', '/checkout', 'acme/', 'checkout@'])(
    'refuses %s rather than guessing',
    (raw) => {
      expect(() => parseAddress(raw)).toThrow(/is not a package name/);
    },
  );
});

describe('resolvePackage', () => {
  const ARGV = { registry: 'http://localhost:7150' };

  beforeEach(() => jest.clearAllMocks());

  it('takes the scope the name carries, without asking for one', async () => {
    await expect(resolvePackage({ ...ARGV, name: 'acme/checkout' })).resolves.toEqual({
      scopeId: 'acme',
      name: 'checkout',
    });
    expect(resolveScopeId).not.toHaveBeenCalled();
  });

  it('prefers the name over --scope, which only fills in for a bare name', async () => {
    await expect(
      resolvePackage({ ...ARGV, name: '@acme/checkout', scope: 'other' }),
    ).resolves.toMatchObject({ scopeId: 'acme' });
    await expect(
      resolvePackage({ ...ARGV, name: 'checkout', scope: 'other' }),
    ).resolves.toMatchObject({ scopeId: 'other' });
  });

  it('resolves the scope for a bare name', async () => {
    await expect(resolvePackage({ ...ARGV, name: 'checkout@1.2.3' })).resolves.toEqual({
      scopeId: 'mine',
      name: 'checkout',
      version: '1.2.3',
    });
  });
});
