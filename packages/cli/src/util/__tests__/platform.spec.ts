import axios from '../axios';
import { ensureToken } from '../credentials';
import { OrganizationsClient, platformApi } from '../platform';

jest.mock('../axios', () => ({ __esModule: true, default: { request: jest.fn() } }));
jest.mock('../credentials', () => ({ ensureToken: jest.fn() }));

const request = axios.request as jest.Mock;

describe('platformApi', () => {
  it('uses an explicit api, without a trailing slash', () => {
    expect(platformApi('https://api.example.test/', 'https://auth.other.test/realms/x')).toBe(
      'https://api.example.test',
    );
  });

  /* The platform names its hosts after the identity domain. */
  it('derives the api from the auth issuer, in production and locally', () => {
    expect(platformApi(undefined, 'https://auth.appshell.org/realms/appshell')).toBe(
      'https://api.appshell.org',
    );
    expect(platformApi(undefined, 'https://auth.local.appshell.org/realms/appshell')).toBe(
      'https://api.local.appshell.org',
    );
  });

  /* A self-hosted registry names its hosts freely: nothing is guessed. */
  it('derives nothing from an issuer not named auth.<domain>, or from none', () => {
    expect(platformApi(undefined, 'https://sso.example.test/realms/x')).toBeUndefined();
    expect(platformApi(undefined, undefined)).toBeUndefined();
    expect(platformApi(undefined, 'not a url')).toBeUndefined();
  });
});

describe('OrganizationsClient', () => {
  const client = new OrganizationsClient('https://api.example.test', 'https://registry.example.test');

  beforeEach(() => {
    jest.clearAllMocks();
    (ensureToken as jest.Mock).mockResolvedValue('tok');
    request.mockResolvedValue({ data: { id: 'org-1' } });
  });

  it('creates through the gateway, with the registry credential', async () => {
    await client.create('acme', 'Acme');

    expect(ensureToken).toHaveBeenCalledWith('https://registry.example.test');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: 'https://api.example.test/api/organizations',
        data: { slug: 'acme', displayName: 'Acme' },
        headers: { Authorization: 'Bearer tok' },
      }),
    );
  });

  it('adds a member to the organization by id', async () => {
    await client.addMember('org-1', 'user-9', 'admin');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.example.test/api/organizations/org-1/members',
        data: { userId: 'user-9', role: 'admin' },
      }),
    );
  });

  it('names the action and the status when the platform refuses', async () => {
    request.mockRejectedValue({ response: { status: 403, data: { message: 'not an admin' } } });

    await expect(client.addMember('org-1', 'user-9', 'member')).rejects.toThrow(
      'Failed to add member: 403 not an admin',
    );
  });
});
