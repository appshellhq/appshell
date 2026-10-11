/* eslint-disable no-console */
import { ensureToken } from '../../util/credentials';
import whoami from '../whoami';

jest.mock('../../util/credentials', () => ({ ensureToken: jest.fn() }));

const tokenWith = (claims: object) =>
  `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

describe('appshell whoami', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));

  /* The user id is what an organization's admin needs to add you. */
  it('shows the user id and username from the stored token', async () => {
    (ensureToken as jest.Mock).mockResolvedValue(
      tokenWith({ sub: 'user-9', preferred_username: 'rh', iss: 'https://auth.appshell.org/realms/appshell' }),
    );

    await whoami({ registry: 'https://registry.appshell.org' } as never);

    const out = (console.log as jest.Mock).mock.calls.flat().join('\n');
    expect(out).toMatch(/rh/);
    expect(out).toMatch(/user id\S*\s+user-9/);
  });

  it('says to log in when there is no credential', async () => {
    (ensureToken as jest.Mock).mockResolvedValue(undefined);

    await expect(whoami({ registry: 'https://registry.appshell.org' } as never)).rejects.toThrow(
      /appshell login/,
    );
  });
});
