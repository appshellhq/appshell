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

  it.each([
    'acme/checkout/extra',
    '@acme/checkout/extra',
    '/checkout',
    'acme/',
    'checkout@',
    // Copilot on appshellhq/appshell#39: npm's sigil with no scope, and a version with a path in it.
    '@/checkout',
    '@acme',
    'acme/checkout@1.2.3/extra',
  ])('refuses %s rather than guessing', (raw) => {
    expect(() => parseAddress(raw)).toThrow(/is not a package name/);
  });
});

describe('resolvePackage', () => {
  const ARGV = { registry: 'http://localhost:7150' };

  beforeEach(() => jest.clearAllMocks());

  it('takes the scope the name carries, without asking for one', async () => {
    await expect(resolvePackage({ ...ARGV, name: 'acme/checkout' }, 'optional')).resolves.toEqual({
      scopeId: 'acme',
      name: 'checkout',
    });
    expect(resolveScopeId).not.toHaveBeenCalled();
  });

  it('prefers the name over --scope, which only fills in for a bare name', async () => {
    await expect(
      resolvePackage({ ...ARGV, name: '@acme/checkout', scope: 'other' }, 'optional'),
    ).resolves.toMatchObject({ scopeId: 'acme' });
    await expect(
      resolvePackage({ ...ARGV, name: 'checkout', scope: 'other' }, 'optional'),
    ).resolves.toMatchObject({ scopeId: 'other' });
  });

  it('resolves the scope for a bare name', async () => {
    await expect(resolvePackage({ ...ARGV, name: 'checkout@1.2.3' }, 'optional')).resolves.toEqual({
      scopeId: 'mine',
      name: 'checkout',
      version: '1.2.3',
    });
  });

  /* Copilot on appshellhq/appshell#39: a version in the name is never silently dropped. */
  describe('a version in the name', () => {
    it('is refused where the command applies to every version', async () => {
      await expect(
        resolvePackage({ ...ARGV, name: 'acme/checkout@1.2.3' }, 'none'),
      ).rejects.toThrow(/applies to every version/);
      await expect(resolvePackage({ ...ARGV, name: 'acme/checkout' }, 'none')).resolves.toEqual({
        scopeId: 'acme',
        name: 'checkout',
      });
    });

    it('is refused when it disagrees with the version given on its own', async () => {
      await expect(
        resolvePackage({ ...ARGV, name: 'acme/checkout@1.2.3' }, { positional: '2.0.0' }),
      ).rejects.toThrow(/names version 1.2.3, but the command was given 2.0.0/);
    });

    it('is the version given on its own, whether or not the name repeats it', async () => {
      await expect(
        resolvePackage({ ...ARGV, name: 'acme/checkout@1.2.3' }, { positional: '1.2.3' }),
      ).resolves.toMatchObject({ version: '1.2.3' });
      await expect(
        resolvePackage({ ...ARGV, name: 'acme/checkout' }, { positional: '1.2.3' }),
      ).resolves.toMatchObject({ version: '1.2.3' });
    });
  });
});
