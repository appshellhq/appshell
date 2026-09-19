import { create, get, list, release, transfer } from '../src/handlers/scopes';
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
          releaseScope: jest
            .fn()
            .mockResolvedValue({ scopeId: 'acme', outcome: 'released', message: 'free again' }),
          transferScope: jest.fn().mockResolvedValue({
            ...scope('acme'),
            owner: { kind: 'org', id: 'acme-inc' },
          }),
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

  /*
   * appshellhq/appshell-services#32. The api could transfer a scope and nothing could
   * reach it, so the only way to move a namespace was an http request written by hand.
   */
  describe('transfer', () => {
    const args = { ...(argv as object), name: 'acme', organization: 'acme-inc' } as never;

    it('hands the scope to the organization named', async () => {
      const transferScope = jest.fn().mockResolvedValue({
        ...scope('acme'),
        owner: { kind: 'org' as const, id: 'acme-inc' },
      });
      wire({ transferScope });

      await transfer(args);

      expect(transferScope).toHaveBeenCalledWith('acme', 'acme-inc');
    });

    it('names the organization that now owns it', async () => {
      await transfer(args);

      expect(output()).toContain('org acme-inc');
    });

    /*
     * There is no route that returns an organization-owned scope to a person, so somebody
     * who ran this by mistake needs to know that straight away rather than discover it by
     * looking for the command that undoes it.
     */
    it('says the scope is no longer yours', async () => {
      await transfer(args);

      expect(output()).toMatch(/no longer by you/i);
    });

    /* A refusal is the interesting answer here: not a member, or not the owner. */
    it('surfaces a refusal rather than reporting success', async () => {
      wire({
        transferScope: jest
          .fn()
          .mockRejectedValue(new Error("403 You are not a member of organization 'acme-inc'")),
      });

      await expect(transfer(args)).rejects.toThrow(/not a member/);
      expect(output()).not.toMatch(/Transferred/);
    });
  });

  /*
   * appshellhq/appshell-services#32. The caller does not choose the outcome — a scope that
   * never published is released and its name returns to the pool, one that published is
   * retired and the name is spent — so the command must report which happened rather than
   * claim either.
   */
  describe('release', () => {
    const args = { ...(argv as object), name: 'acme' } as never;

    it('should ask the registry to give up the scope', async () => {
      const releaseScope = jest
        .fn()
        .mockResolvedValue({ scopeId: 'acme', outcome: 'released', message: 'free again' });
      wire({ releaseScope });

      await release(args);

      expect(releaseScope).toHaveBeenCalledWith('acme');
    });

    it('should say the name is free when it was released', async () => {
      await release(args);

      expect(output()).toMatch(/free again/i);
      expect(output()).not.toMatch(/spent/i);
    });

    /* The outcomes are not interchangeable, and a retirement reported as a release would
     * tell somebody they could reclaim a name that is gone for good. */
    it('should say the name is spent when it was retired', async () => {
      wire({
        releaseScope: jest
          .fn()
          .mockResolvedValue({ scopeId: 'acme', outcome: 'retired', message: 'cannot be reused' }),
      });

      await release(args);

      expect(output()).toMatch(/Retired acme/);
      expect(output()).toMatch(/spent/i);
    });

    it('should surface a refusal rather than reporting success', async () => {
      wire({
        releaseScope: jest.fn().mockRejectedValue(new Error('422 Scope still holds 2 packages')),
      });

      await expect(release(args)).rejects.toThrow(/still holds/);
      expect(output()).not.toMatch(/Released|Retired/);
    });
  });
});
