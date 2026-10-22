import { status, stop } from '../src/handlers/dev';
import { RegistryClient } from '../src/util/registry';

jest.mock('../src/util/registry', () => ({
  ...jest.requireActual('../src/util/registry'),
  RegistryClient: jest.fn(),
}));

// Not run from inside a package workspace, so the listing is only the registry's.
jest.mock('../src/util/workspace', () => ({
  ...jest.requireActual('../src/util/workspace'),
  findWorkspace: () => undefined,
}));

const Client = RegistryClient as jest.MockedClass<typeof RegistryClient>;

const overlay = (id: string, remotes: string[]) => ({
  id,
  openedBy: { id: 'u-rh', username: 'rhamilton' },
  remotes,
  shellFlavor: 'dev' as const,
  createdAt: '2026-10-21T00:00:00.000Z',
  expiresAt: '2026-10-22T00:00:00.000Z',
  confirmUrl: `/overlays/${id}/confirm`,
});

// The application given with -a, which isn't the one the CLI's config names: the case the
// printed commands used to get wrong.
const argv = (more: Record<string, unknown> = {}) =>
  ({
    registry: 'https://registry.test',
    application: 'appshell/workspace-preview',
    defaultScope: 'appshell',
    ...more,
  } as never);

/*
 * Every command `dev` prints is printed to be pasted, so each has to name the application it
 * acts on and use flags that exist. `dev status -a appshell/workspace-preview` used to offer
 * `appshell dev stop <id>`, which looked on the configured application instead and blamed
 * expiry, and `appshell dev stop --pkg <package>`, a flag `stop` doesn't have.
 */
describe('the commands dev prints', () => {
  let logged: string[];
  const output = () => logged.join('\n');
  const stopCommands = () => output().match(/appshell dev stop[^\n]*/g) ?? [];

  const wire = (over: Record<string, unknown> = {}) => {
    Client.mockImplementation(
      () =>
        ({
          baseUrl: 'https://registry.test',
          listOverlays: jest
            .fn()
            .mockResolvedValue([overlay('0c84ec7e', ['appshell/workspace/Workspace'])]),
          getApplication: jest.fn().mockResolvedValue({
            packages: { 'appshell/workspace': { packageId: 'appshell/workspace@0.2.0' } },
          }),
          packageManifest: jest.fn().mockResolvedValue({
            components: { 'WorkspaceModule/Workspace': {} },
            remotes: { 'appshell/workspace/Workspace': {} },
          }),
          closeOverlay: jest.fn().mockResolvedValue({ id: '0c84ec7e', revoked: true }),
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

  it('names the application in every stop command status offers', async () => {
    await status(argv());

    expect(stopCommands()).toEqual([
      'appshell dev stop --package workspace -a appshell/workspace-preview',
      'appshell dev stop 0c84ec7e -a appshell/workspace-preview',
    ]);
  });

  it('offers stop commands with flags stop has', async () => {
    await status(argv());

    expect(output()).not.toContain('--pkg');
  });

  it('names the application an overlay it stopped was on', async () => {
    await stop(argv({ id: '0c84ec7e', all: false }));

    expect(output()).toContain('Stopped overlay 0c84ec7e on appshell/workspace-preview.');
  });

  it('names the application it looked in when there was nothing to stop, and how to look elsewhere', async () => {
    wire({ closeOverlay: jest.fn().mockResolvedValue({ id: '0c84ec7e', revoked: false }) });

    await stop(argv({ application: 'appshell/appshell-example', id: '0c84ec7e', all: false }));

    expect(output()).toContain('No overlay 0c84ec7e on appshell/appshell-example to stop.');
    expect(output()).toContain('another application');
    expect(output()).toContain("'appshell dev status -a <scope>/<name>'");
  });

  it('names the application when it asks which of several overlays to stop a package in', async () => {
    wire({
      listOverlays: jest
        .fn()
        .mockResolvedValue([
          overlay('o1', ['appshell/workspace/Workspace']),
          overlay('o2', ['appshell/workspace/Workspace']),
        ]),
    });

    await expect(stop(argv({ package: 'workspace', all: false }))).rejects.toThrow(
      'appshell dev stop o1 --package workspace -a appshell/workspace-preview, ' +
        'appshell dev stop o2 --package workspace -a appshell/workspace-preview',
    );
  });
});
