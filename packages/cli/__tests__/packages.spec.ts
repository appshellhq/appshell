import { describe as describePackage, get, list } from '../src/handlers/packages';
import { RegistryClient } from '../src/util/registry';

jest.mock('../src/util/registry');

const Client = RegistryClient as jest.MockedClass<typeof RegistryClient>;

/*
 * The listing exists for one question: which version is load-bearing. `unpublish` takes a
 * version, and until this the cli could not say which versions existed, let alone which
 * one an application had activated — so the answer came from reading registry json by
 * hand, and the wrong version was named for removal.
 */
describe('packages', () => {
  const pkg = (version: string, overrides = {}) => ({
    id: `appshell/thing@${version}`,
    scopeId: 'appshell',
    name: 'thing',
    version,
    owner: 'rh',
    visibility: 'public' as const,
    digest: `digest-${version}`,
    publishedAt: `2026-09-1${version.slice(-1)}T00:00:00.000Z`,
    ...overrides,
  });

  const application = (packageId: string) => ({
    id: 'appshell/demo',
    scopeId: 'appshell',
    name: 'demo',
    owner: 'rh',
    ephemeral: false,
    revision: 1,
    packages: { 'appshell/thing': { packageId, activatedAt: '2026-09-11T00:00:00.000Z' } },
    createdAt: '',
    lastModifiedAt: '',
  });

  let logged: string[];

  const wire = (over: Record<string, unknown> = {}) => {
    Client.mockImplementation(
      () =>
        ({
          listPackages: jest.fn().mockResolvedValue([pkg('0.1.1'), pkg('0.1.3')]),
          packageVersions: jest.fn().mockResolvedValue([pkg('0.1.1'), pkg('0.1.3')]),
          getPackage: jest.fn().mockResolvedValue(pkg('0.1.3')),
          listApplications: jest.fn().mockResolvedValue([application('appshell/thing@0.1.3')]),
          ...over,
        } as never),
    );
  };

  beforeEach(() => {
    logged = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      logged.push(args.join(' '));
    });
    wire();
  });

  afterEach(() => jest.restoreAllMocks());

  const output = () => logged.join('\n');

  const argv = { registry: 'https://r', scopeId: 'appshell' } as never;

  it('should say which version an application has activated', async () => {
    await list(argv);

    expect(output()).toMatch(/0\.1\.3.*activated in appshell\/demo/);
  });

  /* The other half of the same fact: a version nothing points at is safe to remove. */
  it('should say when a version is activated nowhere', async () => {
    await list(argv);

    expect(output()).toMatch(/0\.1\.1.*not activated/);
  });

  it('should read newest first, since that is the version usually wanted', async () => {
    await list(argv);

    expect(output().indexOf('0.1.3')).toBeLessThan(output().indexOf('0.1.1'));
  });

  it('should list every version of one package', async () => {
    await get({ ...(argv as object), name: 'thing' } as never);

    expect(output()).toContain('0.1.1');
    expect(output()).toContain('0.1.3');
  });

  /* Defaults to the latest, the way the registry's own unversioned read does. */
  it('should describe the latest version when none is named', async () => {
    await describePackage({ ...(argv as object), name: 'thing' } as never);

    expect(output()).toContain('appshell/thing@0.1.3');
  });

  it('should describe an exact version when one is named', async () => {
    const getPackage = jest.fn().mockResolvedValue(pkg('0.1.1'));

    wire({ getPackage });
    await describePackage({ ...(argv as object), name: 'thing@0.1.1' } as never);

    expect(getPackage).toHaveBeenCalledWith('appshell', 'thing', '0.1.1');
  });

  it('should accept a scope-qualified name', async () => {
    const packageVersions = jest.fn().mockResolvedValue([pkg('0.1.3')]);

    wire({ packageVersions });
    await get({ ...(argv as object), name: 'other/thing' } as never);

    expect(packageVersions).toHaveBeenCalledWith('other', 'thing');
  });

  it('should say so plainly when a scope holds nothing', async () => {
    wire({ listPackages: jest.fn().mockResolvedValue([]) });
    await list(argv);

    expect(output()).toContain('No packages published in appshell');
  });
});
