import { create, get, list } from '../src/handlers/scopes';
import { RegistryClient } from '../src/util/registry';

jest.mock('../src/util/registry');

const Client = RegistryClient as jest.MockedClass<typeof RegistryClient>;

const scope = (id: string, ownerId = 'me') => ({
  id,
  owner: { kind: 'user' as const, id: ownerId },
  createdAt: '2026-09-12T00:00:00.000Z',
});

/*
 * The registry has refused a publish into an unclaimed scope since it learned to read the
 * one a package declares, and it names this command when it does. The instruction pointed
 * at nothing until now, so the refusal was a dead end.
 */
describe('scopes', () => {
  let logged: string[];

  const wire = (over: Record<string, unknown> = {}) => {
    Client.mockImplementation(
      () =>
        ({
          createScope: jest.fn().mockResolvedValue({ scope: scope('acme'), created: true }),
          listScopes: jest.fn().mockResolvedValue([scope('acme'), scope('other')]),
          getScope: jest.fn().mockResolvedValue(scope('acme')),
          ...over,
        } as never),
    );
  };

  const argv = { registry: 'https://registry.test' } as never;

  beforeEach(() => {
    logged = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      logged.push(args.join(' '));
    });
    wire();
  });

  afterEach(() => jest.restoreAllMocks());

  const output = () => logged.join('\n');

  it('reports a claim', async () => {
    await create({ ...(argv as object), name: 'acme' } as never);

    expect(output()).toContain('Claimed acme');
  });

  it('says so when the scope is already yours, rather than claiming it again', async () => {
    wire({ createScope: jest.fn().mockResolvedValue({ scope: scope('acme'), created: false }) });

    await create({ ...(argv as object), name: 'acme' } as never);

    expect(output()).toContain('already yours');
  });

  it('lists the scopes you own', async () => {
    await list(argv);

    expect(output()).toContain('acme');
    expect(output()).toContain('other');
  });

  it('points a new account at how a scope appears, rather than showing an empty table', async () => {
    wire({ listScopes: jest.fn().mockResolvedValue([]) });

    await list(argv);

    expect(output()).toContain('Publishing provisions your own');
  });

  it('names the owner of a scope that is taken', async () => {
    await get({ ...(argv as object), name: 'acme' } as never);

    expect(output()).toContain('owned by me');
  });

  /*
   * A 404 is the answer to `is this name free`, not a failure. Letting it throw would
   * report the one question this command exists to answer as an error.
   */
  it('treats an unclaimed name as an answer, not an error', async () => {
    wire({
      getScope: jest.fn().mockRejectedValue(new Error('Failed to get scope: 404 Not Found')),
    });

    await expect(get({ ...(argv as object), name: 'free' } as never)).resolves.toBeUndefined();
    expect(output()).toContain('free is unclaimed');
  });

  it('still surfaces a real failure', async () => {
    wire({ getScope: jest.fn().mockRejectedValue(new Error('Failed to get scope: 500 boom')) });

    await expect(get({ ...(argv as object), name: 'acme' } as never)).rejects.toThrow(/500/);
  });
});
