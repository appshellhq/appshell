import { describe as describePackage, get, list, unpublished } from '../src/handlers/packages';
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
    publishedBy: { id: 'u-rh', username: 'rh' },
    visibility: 'public' as const,
    digest: `digest-${version}`,
    publishedAt: `2026-09-1${version.slice(-1)}T00:00:00.000Z`,
    ...overrides,
  });

  const application = (packageId: string) => ({
    id: 'appshell/demo',
    scopeId: 'appshell',
    name: 'demo',
    publishedBy: { id: 'u-rh', username: 'rh' },
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

  const argv = { registry: 'https://r', defaultScope: 'appshell' } as never;

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

/*
 * appshellhq/appshell-services#29. What `restore` can still bring back, each with the command
 * that does it, naming the scope so it's right whichever way this one was chosen.
 */
describe('packages unpublished', () => {
  let logged: string[];

  beforeEach(() => {
    logged = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      logged.push(args.join(' '));
    });
  });

  afterEach(() => jest.restoreAllMocks());

  const wire = (versions: unknown[]) =>
    Client.mockImplementation(
      () => ({ unpublishedVersions: jest.fn().mockResolvedValue(versions) } as never),
    );

  it('should list each restorable version with how to restore it', async () => {
    wire([
      {
        id: 'acme/checkout@1.2.0',
        scopeId: 'acme',
        name: 'checkout',
        version: '1.2.0',
        digest: 'd',
        publishedAt: '2026-10-01T00:00:00.000Z',
        unpublishedAt: '2026-10-10T00:00:00.000Z',
        unpublishedBy: { id: 'u-1', username: 'rh' },
        restorableUntil: '2026-11-09T00:00:00.000Z',
      },
    ]);

    await unpublished({ registry: 'https://r', name: 'acme/checkout' } as never);

    const output = logged.join('\n');
    expect(output).toMatch(/1\.2\.0.*unpublished by rh, restorable until 2026-11-09/);
    expect(output).toMatch(
      /appshell restore checkout 1\.2\.0 --defaultScope acme --registry https:\/\/r/,
    );
  });

  /* Copilot on appshellhq/appshell#37: the hint must restore on the registry that was asked. */
  it('should keep an explicit registry in the hint', async () => {
    wire([
      {
        id: 'acme/checkout@1.2.0',
        scopeId: 'acme',
        name: 'checkout',
        version: '1.2.0',
        digest: 'd',
        publishedAt: '2026-10-01T00:00:00.000Z',
        unpublishedAt: '2026-10-10T00:00:00.000Z',
        unpublishedBy: { id: 'u-1', username: 'rh' },
        restorableUntil: '2026-11-09T00:00:00.000Z',
      },
    ]);

    await unpublished({ registry: 'https://other.example', name: 'acme/checkout' } as never);

    expect(logged.join('\n')).toMatch(/--registry https:\/\/other\.example/);
  });

  it('should say when there is nothing to restore', async () => {
    wire([]);

    await unpublished({ registry: 'https://r', name: 'acme/checkout' } as never);

    expect(logged.join('\n')).toMatch(/no unpublished versions that can be restored/);
  });
});
