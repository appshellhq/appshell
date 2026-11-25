import fs from 'fs';
import os from 'os';
import path from 'path';
import axios from '../src/axios';
import { ensureToken, resolveToken, saveCredential } from '../src/credentials';

jest.mock('../src/axios');

const mocked = axios as jest.Mocked<typeof axios>;

/*
 * `appshell login` has always obtained a refresh token and, until ensureToken existed,
 * nothing ever read it: every expiry meant another device-authorization flow — browser,
 * code, approve — with the credential that would have avoided it sitting in the file.
 */
describe('ensureToken', () => {
  const REGISTRY = 'https://registry.example.com';
  const ISSUER = 'https://auth.example.com/realms/x';
  // Not Keycloak's own path, so a renewal that assumed one would miss it.
  const TOKEN_ENDPOINT = 'https://auth.example.com/oauth2/v1/token';
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-creds-'));
    process.env.APPSHELL_CREDENTIALS = path.join(dir, 'credentials');
    delete process.env.APPSHELL_TOKEN;
    jest.resetAllMocks();
    mocked.get.mockResolvedValue({ data: { token_endpoint: TOKEN_ENDPOINT } } as never);
  });

  afterEach(() => {
    delete process.env.APPSHELL_CREDENTIALS;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const stored = (overrides: Record<string, unknown> = {}) =>
    saveCredential(REGISTRY, {
      accessToken: 'old',
      refreshToken: 'refresh',
      issuer: 'https://auth.example.com/realms/x',
      clientId: 'appshell-cli',
      expiresAt: Date.now() - 1000,
      ...overrides,
    });

  it('should return a live token without asking the issuer for another', async () => {
    stored({ expiresAt: Date.now() + 60_000 });

    await expect(ensureToken(REGISTRY)).resolves.toBe('old');
    expect(mocked.post).not.toHaveBeenCalled();
  });

  it('should renew an expired token and hand back the new one', async () => {
    stored();
    mocked.post.mockResolvedValue({
      data: { access_token: 'fresh', refresh_token: 'next', expires_in: 1800 },
    } as never);

    await expect(ensureToken(REGISTRY)).resolves.toBe('fresh');
  });

  it('should persist what it renewed, so the next call needs no round trip', async () => {
    stored();
    mocked.post.mockResolvedValue({
      data: { access_token: 'fresh', refresh_token: 'next', expires_in: 1800 },
    } as never);

    await ensureToken(REGISTRY);

    expect(resolveToken(REGISTRY)).toBe('fresh');
  });

  /*
   * Keycloak rotates refresh tokens by default, so the one just spent may already be
   * dead. Keeping it would store a credential that cannot be used a second time.
   */
  it('should keep the rotated refresh token', async () => {
    stored();
    mocked.post.mockResolvedValue({
      data: { access_token: 'fresh', refresh_token: 'next', expires_in: 1800 },
    } as never);

    await ensureToken(REGISTRY);
    mocked.post.mockClear();
    mocked.post.mockResolvedValue({ data: { access_token: 'fresher', expires_in: 1800 } } as never);

    // Expire it again so the next call has to renew.
    saveCredential(REGISTRY, {
      accessToken: 'fresh',
      refreshToken: 'next',
      issuer: 'https://auth.example.com/realms/x',
      clientId: 'appshell-cli',
      expiresAt: Date.now() - 1000,
    });
    await ensureToken(REGISTRY);

    expect(String(mocked.post.mock.calls[0][1])).toContain('refresh_token=next');
  });

  /*
   * A credential written before the issuer was recorded cannot say where to renew itself.
   * Nothing to do but let the caller's 401 send the developer to `appshell login`.
   */
  it('should give up quietly when the credential cannot say where it came from', async () => {
    stored({ issuer: undefined, clientId: undefined });

    await expect(ensureToken(REGISTRY)).resolves.toBeUndefined();
    expect(mocked.post).not.toHaveBeenCalled();
  });

  /*
   * A refusal here means the account was disabled, the role revoked, or the offline
   * session ended. None of those are this function's to explain, and a network blip on
   * the way to the issuer must not read as "you are logged out".
   */
  it('should not throw when the issuer refuses', async () => {
    stored();
    mocked.post.mockRejectedValue(new Error('invalid_grant'));

    await expect(ensureToken(REGISTRY)).resolves.toBeUndefined();
  });

  /*
   * appshellhq/appshell-services#125. Renewal assumed Keycloak's path, which Okta, PingFederate
   * and Entra ID each answered with a 404, so a session there ended with its first token.
   */
  it('should renew at the token endpoint discovery names, for a credential that has none', async () => {
    stored();
    mocked.post.mockResolvedValue({ data: { access_token: 'fresh', expires_in: 1800 } } as never);

    await expect(ensureToken(REGISTRY)).resolves.toBe('fresh');

    expect(mocked.get).toHaveBeenCalledWith(`${ISSUER}/.well-known/openid-configuration`);
    expect(mocked.post.mock.calls[0][0]).toBe(TOKEN_ENDPOINT);
  });

  it('should keep the discovered endpoint, so it discovers once', async () => {
    stored();
    mocked.post.mockResolvedValue({ data: { access_token: 'fresh', expires_in: -1 } } as never);

    await ensureToken(REGISTRY);
    await ensureToken(REGISTRY);

    expect(mocked.get).toHaveBeenCalledTimes(1);
    expect(mocked.post).toHaveBeenCalledTimes(2);
  });

  it('should renew at the endpoint login stored, without asking discovery', async () => {
    stored({ tokenEndpoint: 'https://idp.example.com/as/token.oauth2' });
    mocked.post.mockResolvedValue({ data: { access_token: 'fresh', expires_in: 1800 } } as never);

    await ensureToken(REGISTRY);

    expect(mocked.get).not.toHaveBeenCalled();
    expect(mocked.post.mock.calls[0][0]).toBe('https://idp.example.com/as/token.oauth2');
  });

  /*
   * RFC 6749 lets a client resend the scope it was granted. Entra ID requires it: without it,
   * the renewed token isn't for the registry's API.
   */
  it('should send the granted scope again, and keep what the renewal grants', async () => {
    stored({ scope: 'openid api://registry/access' });
    mocked.post.mockResolvedValue({
      data: { access_token: 'fresh', expires_in: -1, scope: 'api://registry/access' },
    } as never);

    await ensureToken(REGISTRY);
    await ensureToken(REGISTRY);

    const sent = mocked.post.mock.calls.map(([, body]) => new URLSearchParams(String(body)));
    expect(sent[0].get('scope')).toBe('openid api://registry/access');
    expect(sent[1].get('scope')).toBe('api://registry/access');
  });

  it('should send no scope when the credential records none', async () => {
    stored();
    mocked.post.mockResolvedValue({ data: { access_token: 'fresh', expires_in: 1800 } } as never);

    await ensureToken(REGISTRY);

    expect(new URLSearchParams(String(mocked.post.mock.calls[0][1])).has('scope')).toBe(false);
  });

  it('should give up quietly when discovery fails', async () => {
    stored();
    mocked.get.mockRejectedValue(new Error('404'));

    await expect(ensureToken(REGISTRY)).resolves.toBeUndefined();
    expect(mocked.post).not.toHaveBeenCalled();
  });

  it('should prefer APPSHELL_TOKEN and never renew in ci', async () => {
    stored();
    process.env.APPSHELL_TOKEN = 'from-ci';

    await expect(ensureToken(REGISTRY)).resolves.toBe('from-ci');
    expect(mocked.post).not.toHaveBeenCalled();
  });
});
