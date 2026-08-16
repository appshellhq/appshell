/* eslint-disable no-console */
import chalk from 'chalk';
import axios from '../util/axios';
import { clearCredential, saveCredential } from '../util/credentials';

export type LoginArgs = {
  registry: string;
  authIssuer: string;
  clientId: string;
  clientSecret?: string;
  scope: string;
};

type DeviceAuthorization = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

const wait = (seconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });

const discover = async (issuer: string) => {
  const url = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
  const { data } = await axios.get<{
    device_authorization_endpoint?: string;
    token_endpoint: string;
  }>(url);

  return data;
};

const form = (fields: Record<string, string | undefined>) =>
  new URLSearchParams(
    Object.entries(fields).filter(([, value]) => value !== undefined) as [string, string][],
  );

/** CI path: no browser, no polling, no refresh token. */
const clientCredentials = async (
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string,
  scope: string,
) => {
  const { data } = await axios.post<TokenResponse>(
    tokenEndpoint,
    form({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    }),
  );

  return data;
};

const deviceGrant = async (
  deviceEndpoint: string,
  tokenEndpoint: string,
  clientId: string,
  scope: string,
): Promise<TokenResponse> => {
  const { data: authorization } = await axios.post<DeviceAuthorization>(
    deviceEndpoint,
    form({ client_id: clientId, scope }),
  );

  console.log(
    `\nTo sign in, visit ${chalk.cyan(
      authorization.verification_uri_complete ?? authorization.verification_uri,
    )}`,
  );
  if (!authorization.verification_uri_complete) {
    console.log(`and enter the code ${chalk.bold.yellow(authorization.user_code)}`);
  }
  console.log('\nWaiting for authorization...');

  // The interval is advisory; the server tells us to back off with slow_down.
  let interval = authorization.interval ?? 5;
  const deadline = Date.now() + authorization.expires_in * 1000;

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    await wait(interval);

    try {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await axios.post<TokenResponse>(
        tokenEndpoint,
        form({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: authorization.device_code,
          client_id: clientId,
        }),
      );

      return data;
    } catch (err) {
      const error = (err as { response?: { data?: { error?: string } } }).response?.data?.error;

      if (error === 'slow_down') {
        interval += 5;
      } else if (error !== 'authorization_pending') {
        throw new Error(`Authorization failed: ${error ?? (err as Error).message}`);
      }
    }
  }

  throw new Error('Timed out waiting for authorization.');
};

export default async (argv: LoginArgs) => {
  const { registry, authIssuer, clientId, clientSecret, scope } = argv;

  if (!authIssuer) {
    throw new Error(
      "No auth issuer configured. Run 'appshell config set auth-issuer <url>' or pass --auth-issuer.",
    );
  }

  const { device_authorization_endpoint: deviceEndpoint, token_endpoint: tokenEndpoint } =
    await discover(authIssuer);

  let token: TokenResponse;
  if (clientSecret) {
    token = await clientCredentials(tokenEndpoint, clientId, clientSecret, scope);
  } else if (deviceEndpoint) {
    token = await deviceGrant(deviceEndpoint, tokenEndpoint, clientId, scope);
  } else {
    throw new Error(
      `${authIssuer} does not advertise a device authorization endpoint. Pass --client-secret to use client credentials.`,
    );
  }

  saveCredential(registry, {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
  });

  console.log(chalk.green(`Logged in to ${registry}`));
};

export const logout = async (argv: { registry: string }) => {
  clearCredential(argv.registry);
  console.log(`Logged out of ${argv.registry}`);
};
