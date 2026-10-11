/* eslint-disable no-console */
import { OrganizationsClient } from '../../util/platform';
import { create, membersAdd, membersList } from '../org';

jest.mock('../../util/platform', () => {
  const actual = jest.requireActual('../../util/platform');

  return { ...actual, OrganizationsClient: jest.fn() };
});

const client = { create: jest.fn(), get: jest.fn(), addMember: jest.fn() };
(OrganizationsClient as unknown as jest.Mock).mockImplementation(() => client);

const args = {
  registry: 'https://registry.appshell.org',
  authIssuer: 'https://auth.appshell.org/realms/appshell',
};

describe('appshell org', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    (OrganizationsClient as unknown as jest.Mock).mockImplementation(() => client);
  });

  it('creates on the api derived from the issuer, named by its slug when no display name is given', async () => {
    client.create.mockResolvedValue({ id: 'org-1' });

    await create({ ...args, slug: 'appshell' } as never);

    expect(OrganizationsClient).toHaveBeenCalledWith('https://api.appshell.org', args.registry);
    expect(client.create).toHaveBeenCalledWith('appshell', 'appshell');
  });

  /* The service adds members to an organization named by id, so the slug is resolved first. */
  it('resolves the slug to the id before adding a member', async () => {
    client.get.mockResolvedValue({ id: 'org-1', slug: 'appshell', members: [] });

    await membersAdd({ ...args, organization: 'appshell', userId: 'user-9', role: 'member' } as never);

    expect(client.get).toHaveBeenCalledWith('appshell');
    expect(client.addMember).toHaveBeenCalledWith('org-1', 'user-9', 'member');
  });

  it('lists members with their roles', async () => {
    client.get.mockResolvedValue({
      id: 'org-1',
      slug: 'appshell',
      displayName: 'Appshell',
      members: [{ userId: 'user-1', role: 'owner', addedAt: '2026-10-11T00:00:00.000Z' }],
    });

    await membersList({ ...args, organization: 'appshell' } as never);

    expect((console.log as jest.Mock).mock.calls.flat().join('\n')).toMatch(/user-1\s+owner/);
  });

  it('says how to name the platform api when none can be found', async () => {
    await expect(
      create({ registry: args.registry, authIssuer: 'https://sso.example.test/realms/x', slug: 'x' } as never),
    ).rejects.toThrow(/Set --api/);
  });
});
