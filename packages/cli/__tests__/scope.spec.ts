import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseApplication, RegistryClient } from '../src/util/registry';
import { declaredScope, defaultScopeFor, resetScopeCache, resolveScopeId } from '../src/util/scope';

jest.mock('../src/util/registry', () => ({
  ...jest.requireActual('../src/util/registry'),
  RegistryClient: jest.fn(),
}));

const Client = RegistryClient as jest.MockedClass<typeof RegistryClient>;

const scope = (id: string) => ({
  id,
  owner: { kind: 'user' as const, id: 'me' },
  createdAt: '2026-09-12T00:00:00.000Z',
});

/** A real directory, because what is under test is reading a real package.json. */
const dirWith = (pkg: Record<string, unknown> | null): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-scope-'));
  if (pkg) fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));

  return dir;
};

const listing = (ids: string[]) => {
  const listScopes = jest.fn().mockResolvedValue(ids.map(scope));
  Client.mockImplementation(() => ({ listScopes } as never));

  return listScopes;
};

/*
 * appshellhq/appshell#3: the cli resolved scope from config while publish resolved it
 * from the package name, so `@acme/foo` published into `acme` and was then addressed as
 * `default/foo`. The publish succeeded and the package appeared to have vanished, which
 * is the failure mode worth keeping tests on — nothing errors, so only an assertion about
 * *which* namespace was asked for can see it.
 */
describe('resolveScopeId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetScopeCache();
  });

  it('should take what the caller said, without asking anything else', async () => {
    const listScopes = listing(['owned']);

    await expect(
      resolveScopeId({ registry: 'r', defaultScope: 'said' }, dirWith(null)),
    ).resolves.toBe('said');
    expect(listScopes).not.toHaveBeenCalled();
  });

  it('should take the scope the package in this directory declares', async () => {
    const listScopes = listing(['owned']);
    const cwd = dirWith({ name: '@acme/checkout', version: '1.0.0' });

    await expect(resolveScopeId({ registry: 'r' }, cwd)).resolves.toBe('acme');
    // The declared scope is checked in and identical for everyone, so there is nothing to
    // ask the registry about.
    expect(listScopes).not.toHaveBeenCalled();
  });

  it('should let an explicit scope override the one the package declares', async () => {
    const cwd = dirWith({ name: '@acme/checkout', version: '1.0.0' });

    await expect(resolveScopeId({ registry: 'r', defaultScope: 'other' }, cwd)).resolves.toBe(
      'other',
    );
  });

  it('should fall back to the one scope the account owns', async () => {
    listing(['mine']);
    const cwd = dirWith({ name: 'unscoped-thing', version: '1.0.0' });

    await expect(resolveScopeId({ registry: 'r' }, cwd)).resolves.toBe('mine');
  });

  it('should refuse to guess when the account owns several', async () => {
    listing(['one', 'two']);

    await expect(resolveScopeId({ registry: 'r' }, dirWith(null))).rejects.toThrow(
      /owns 2 scopes.*one, two/s,
    );
  });

  it('should say how to get a scope when the account owns none', async () => {
    listing([]);

    await expect(resolveScopeId({ registry: 'r' }, dirWith(null))).rejects.toThrow(/scopes create/);
  });

  it('should ask the registry once for repeated questions in a command', async () => {
    const cwd = dirWith(null);
    const listScopes = listing(['mine']);

    await Promise.all([
      resolveScopeId({ registry: 'r' }, cwd),
      resolveScopeId({ registry: 'r' }, cwd),
    ]);
    await resolveScopeId({ registry: 'r' }, cwd);

    expect(listScopes).toHaveBeenCalledTimes(1);
  });

  /*
   * A cached rejection would outlive its cause: the usual reasons to fail here are being
   * logged out or owning no scope yet, and both are fixed by doing something and running
   * the command again.
   */
  it('should not remember a failure', async () => {
    const cwd = dirWith(null);
    const listScopes = jest
      .fn()
      .mockRejectedValueOnce(new Error('401'))
      .mockResolvedValueOnce([scope('mine')]);
    Client.mockImplementation(() => ({ listScopes } as never));

    await expect(resolveScopeId({ registry: 'r' }, cwd)).rejects.toThrow('401');
    await expect(resolveScopeId({ registry: 'r' }, cwd)).resolves.toBe('mine');
  });
});

describe('declaredScope', () => {
  it.each([
    ['a scoped name', { name: '@acme/checkout' }, 'acme'],
    ['an unscoped name', { name: 'checkout' }, undefined],
    ['no name at all', { version: '1.0.0' }, undefined],
  ])('should read %s', (_case, pkg, expected) => {
    expect(declaredScope(dirWith(pkg))).toBe(expected);
  });

  /*
   * Not being in a package is not an error. The question is only where to look something
   * up, and an unreadable directory simply does not answer it — the next source does.
   */
  it('should stay quiet when there is no package.json', () => {
    expect(declaredScope(dirWith(null))).toBeUndefined();
  });

  it('should stay quiet when the package.json is not valid json', () => {
    const dir = dirWith(null);
    fs.writeFileSync(path.join(dir, 'package.json'), '{ not json');

    expect(declaredScope(dir)).toBeUndefined();
  });
});

/*
 * appshellhq/appshell-services#125: every command resolved the default before reading the name,
 * so a qualified name still asked which scopes the account owns, which needs the write role.
 */
describe('defaultScopeFor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetScopeCache();
  });

  it.each(['acme/portal', 'acme/hello@1.0.0'])(
    'asks nothing for %s, which says its scope',
    async (name) => {
      const listScopes = listing(['owned']);

      await expect(
        defaultScopeFor(name, { registry: 'r' }, dirWith(null)),
      ).resolves.toBeUndefined();
      expect(listScopes).not.toHaveBeenCalled();
    },
  );

  it.each(['portal', 'hello@1.0.0'])('resolves the default for %s', async (name) => {
    listing(['owned']);

    await expect(defaultScopeFor(name, { registry: 'r' }, dirWith(null))).resolves.toBe('owned');
  });
});

describe('resolveScopeId for an account that may only read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetScopeCache();
  });

  it('says how to avoid the lookup when the registry refuses it', async () => {
    const refused = Object.assign(
      new Error("Failed to list scopes: 403 This action requires the 'publishers' role."),
      { cause: { response: { status: 403 } } },
    );
    Client.mockImplementation(
      () => ({ listScopes: jest.fn().mockRejectedValue(refused) } as never),
    );

    await expect(resolveScopeId({ registry: 'r' }, dirWith(null))).rejects.toThrow(
      "Failed to list scopes: 403 This action requires the 'publishers' role. Qualify the name " +
        "as 'scope/name', or set a default with 'appshell config set default-scope <name>'.",
    );
  });
});

describe('parseApplication without a default', () => {
  it('takes the scope a qualified name says', () => {
    expect(parseApplication('acme/portal')).toEqual({ scopeId: 'acme', name: 'portal' });
  });

  it('asks for the scope when a bare name has none to default to', () => {
    expect(() => parseApplication('portal')).toThrow(
      "No scope for 'portal'. Name it as 'scope/portal'.",
    );
  });
});
