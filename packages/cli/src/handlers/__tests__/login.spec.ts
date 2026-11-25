import { createHash } from 'crypto';
import axios from '../../util/axios';
import { saveCredential } from '../../util/credentials';
import login, { pkcePair } from '../login';

jest.mock('../../util/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('../../util/credentials', () => ({
  saveCredential: jest.fn(),
  clearCredential: jest.fn(),
}));

const get = axios.get as jest.Mock;
const post = axios.post as jest.Mock;

const issuer = 'https://auth.example.test/realms/appshell';
const deviceEndpoint = `${issuer}/protocol/openid-connect/auth/device`;
const tokenEndpoint = `${issuer}/protocol/openid-connect/token`;
const args = {
  registry: 'https://registry.example.test',
  authIssuer: issuer,
  clientId: 'appshell-cli',
  scope: 'openid',
};

const sent = (call: unknown[]) => Object.fromEntries(call[1] as URLSearchParams);

/*
 * appshell-cli is a public client, and the realm requires S256 PKCE of it, on the device
 * authorization endpoint as on a browser's code exchange: without the challenge, Keycloak
 * answers 400 "Missing parameter: code_challenge_method" before any user code is shown.
 */
describe('login, device grant', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    get.mockResolvedValue({
      data: { device_authorization_endpoint: deviceEndpoint, token_endpoint: tokenEndpoint },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    get.mockReset();
    post.mockReset();
  });

  it('sends an S256 challenge, and redeems with the verifier that hashes to it', async () => {
    post
      .mockResolvedValueOnce({
        data: {
          device_code: 'dc',
          user_code: 'UC',
          verification_uri: 'https://v',
          expires_in: 60,
          interval: 0,
        },
      })
      .mockResolvedValueOnce({
        data: { access_token: 'at', refresh_token: 'rt', expires_in: 300 },
      });

    await login(args);

    const [authorize, redeem] = post.mock.calls;
    expect(authorize[0]).toBe(deviceEndpoint);
    expect(sent(authorize)).toMatchObject({
      client_id: 'appshell-cli',
      code_challenge_method: 'S256',
    });
    expect(redeem[0]).toBe(tokenEndpoint);
    const { code_challenge: challenge } = sent(authorize);
    const { code_verifier: verifier, device_code: deviceCode } = sent(redeem);
    expect(deviceCode).toBe('dc');
    expect(createHash('sha256').update(verifier).digest('base64url')).toBe(challenge);
    expect(saveCredential).toHaveBeenCalledWith(
      args.registry,
      expect.objectContaining({ accessToken: 'at', refreshToken: 'rt' }),
    );
  });

  it("reports the server's reason when authorization is refused, not axios's status line", async () => {
    post.mockRejectedValueOnce({
      message: 'Request failed with status code 400',
      response: {
        data: {
          error: 'invalid_request',
          error_description: 'Missing parameter: code_challenge_method',
        },
      },
    });

    await expect(login(args)).rejects.toThrow(
      'Device authorization failed: Missing parameter: code_challenge_method',
    );
  });

  it('keeps polling while authorization is pending', async () => {
    post
      .mockResolvedValueOnce({
        data: {
          device_code: 'dc',
          user_code: 'UC',
          verification_uri: 'https://v',
          expires_in: 60,
          interval: 0,
        },
      })
      .mockRejectedValueOnce({ response: { data: { error: 'authorization_pending' } } })
      .mockResolvedValueOnce({ data: { access_token: 'at' } });

    await login(args);

    expect(post).toHaveBeenCalledTimes(3);
    expect(sent(post.mock.calls[1]).code_verifier).toBe(sent(post.mock.calls[2]).code_verifier);
  });
});

/*
 * The device grant's own standard (RFC 8628) has no PKCE, and Okta refuses the verifier once
 * the person has approved, expiring the device code with it (appshellhq/appshell-services#125).
 */
describe('login, device grant without PKCE', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    get.mockResolvedValue({
      data: { device_authorization_endpoint: deviceEndpoint, token_endpoint: tokenEndpoint },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    get.mockReset();
    post.mockReset();
  });

  const authorization = {
    data: {
      device_code: 'dc',
      user_code: 'UC',
      verification_uri: 'https://v',
      expires_in: 60,
      interval: 0,
    },
  };

  it('sends neither a challenge nor a verifier', async () => {
    post
      .mockResolvedValueOnce(authorization)
      .mockResolvedValueOnce({ data: { access_token: 'at' } });

    await login({ ...args, pkce: false });

    const [authorize, redeem] = post.mock.calls;
    expect(Object.keys(sent(authorize))).toEqual(['client_id', 'scope']);
    expect(Object.keys(sent(redeem))).toEqual(['grant_type', 'device_code', 'client_id']);
  });

  it('says to switch PKCE off when the provider refuses the verifier', async () => {
    post.mockResolvedValueOnce(authorization).mockRejectedValueOnce({
      response: {
        data: {
          error: 'invalid_request',
          error_description:
            'PKCE code challenge should be specified in the authorize request for code verification.',
        },
      },
    });

    await expect(login(args)).rejects.toThrow(
      "This provider doesn't take PKCE on the device grant: log in again with --no-pkce",
    );
  });

  it('says to switch PKCE back on when the provider requires it', async () => {
    post.mockRejectedValueOnce({
      response: {
        data: {
          error: 'invalid_request',
          error_description: 'Missing parameter: code_challenge_method',
        },
      },
    });

    await expect(login({ ...args, pkce: false })).rejects.toThrow(
      'Device authorization failed: Missing parameter: code_challenge_method This provider ' +
        'requires PKCE',
    );
  });

  it('adds nothing to a refusal that isn’t about PKCE', async () => {
    post.mockResolvedValueOnce(authorization).mockRejectedValueOnce({
      response: { data: { error: 'access_denied', error_description: 'The user denied it.' } },
    });

    await expect(login(args)).rejects.toThrow(/^Authorization failed: The user denied it\.$/);
  });
});

describe('pkcePair', () => {
  it('makes a fresh 43-character verifier each time, with its S256 challenge', () => {
    const a = pkcePair();
    const b = pkcePair();

    expect(a.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.challenge).toBe(createHash('sha256').update(a.verifier).digest('base64url'));
  });
});
