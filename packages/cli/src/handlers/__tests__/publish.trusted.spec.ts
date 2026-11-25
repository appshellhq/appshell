/* eslint-disable no-console */
import * as config from '@appshell/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import configAxios from '../../../../config/src/axios';
import axios from '../../util/axios';
import { saveCredential } from '../../util/credentials';
import handler from '../publish';

jest.mock('@appshell/config', () => ({
  ...jest.requireActual('@appshell/config'),
  generateManifest: jest.fn(),
}));
// The publish request itself, made by @appshell/config's real `publish`, so what is
// asserted is the header the registry would receive and the message a refusal produces.
jest.mock('../../../../config/src/axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
// The runner's OIDC endpoint, asked by the cli.
jest.mock('../../util/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));

const post = configAxios.post as jest.Mock;
const get = axios.get as jest.Mock;

const REGISTRY = 'https://registry.example.test';
const REQUEST_URL = 'https://pipelines.actions.test/oidc/token?api-version=2.0';

/** An unsigned JWT: the cli decodes a workflow token's claims for its log and nothing else. */
const jwt = (claims: Record<string, unknown>) =>
  ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.');

const workflowToken = (jti: string) =>
  jwt({
    jti,
    repository: 'acme/widgets',
    job_workflow_ref: 'acme/widgets/.github/workflows/pipeline.yml@refs/heads/main',
    environment: 'production',
  });

const refusal = (status: number, message: string) => ({ response: { status, data: { message } } });

const ENV = [
  'APPSHELL_TOKEN',
  'APPSHELL_CREDENTIALS',
  'ACTIONS_ID_TOKEN_REQUEST_URL',
  'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'GITHUB_ACTIONS',
] as const;

/*
 * Trusted publishing from GitHub Actions, appshellhq/appshell-services#51: with no
 * credential of its own, a job granted `id-token: write` publishes with an OIDC token the
 * runner mints for the registry, and nothing is stored anywhere.
 */
describe('publish, as a GitHub Actions workflow', () => {
  let dir: string;
  let logged: string[];
  const saved = ENV.map((name) => [name, process.env[name]] as const);

  const inActions = ({ oidc = true } = {}) => {
    process.env.GITHUB_ACTIONS = 'true';

    if (oidc) {
      process.env.ACTIONS_ID_TOKEN_REQUEST_URL = REQUEST_URL;
      process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = 'runner-request-token';
    }
  };

  const publishArgs = (registry = REGISTRY) =>
    ({
      registry,
      template: path.join(dir, 'template.json'),
      watch: false,
    } as Parameters<typeof handler>[0]);

  /** The Authorization header each publish request carried. */
  const bearers = () =>
    post.mock.calls.map(([, , options]) => options?.headers?.Authorization as string | undefined);

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-trusted-'));
    ENV.forEach((name) => delete process.env[name]);
    process.env.APPSHELL_CREDENTIALS = path.join(dir, 'credentials');
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: '@acme/widgets', version: '1.2.3' }),
    );
    fs.writeFileSync(path.join(dir, 'template.json'), JSON.stringify({ remotes: {}, module: {} }));
    jest.spyOn(process, 'cwd').mockReturnValue(dir);
    logged = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      logged.push(args.join(' '));
    });
    (config.generateManifest as jest.Mock).mockResolvedValue({ remotes: {} });
    post.mockResolvedValue({ data: { id: 'acme/widgets@1.2.3', created: true } });
    let minted = 0;
    get.mockImplementation(async () => {
      minted += 1;

      return { data: { value: workflowToken(`jti-${minted}`) } };
    });
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    saved.forEach(([name, value]) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  const output = () => logged.join('\n');

  it("asks the runner for a token with the registry as its audience, and the runner's request token", async () => {
    inActions();

    await handler(publishArgs());

    expect(get).toHaveBeenCalledWith(
      `${REQUEST_URL}&audience=${encodeURIComponent(REGISTRY)}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer runner-request-token' }),
      }),
    );
  });

  /* The registry compares `aud` exactly, so the audience is the url without its slash. */
  it('drops a trailing slash from the registry url before using it as the audience', async () => {
    inActions();

    await handler(publishArgs(`${REGISTRY}/`));

    expect(get.mock.calls[0][0]).toBe(`${REQUEST_URL}&audience=${encodeURIComponent(REGISTRY)}`);
  });

  it('presents the workflow token as the bearer of the publish request', async () => {
    inActions();

    await handler(publishArgs());

    expect(post).toHaveBeenCalledWith(
      `${REGISTRY}/v1/packages`,
      expect.objectContaining({ scopeId: 'acme', name: 'widgets', version: '1.2.3' }),
      { headers: { Authorization: `Bearer ${workflowToken('jti-1')}` } },
    );
  });

  it('says which workflow it is publishing as, from the token', async () => {
    inActions();

    await handler(publishArgs());

    expect(output()).toContain(
      'Publishing as acme/widgets/.github/workflows/pipeline.yml@refs/heads/main, environment ' +
        'production, via trusted publishing',
    );
  });

  /* The registry spends a token's jti on first use. */
  it('mints a new token for every publish', async () => {
    inActions();

    await handler(publishArgs());
    await handler(publishArgs());

    expect(get).toHaveBeenCalledTimes(2);
    expect(bearers()).toEqual([
      `Bearer ${workflowToken('jti-1')}`,
      `Bearer ${workflowToken('jti-2')}`,
    ]);
  });

  it('lets an explicit APPSHELL_TOKEN win, without asking the runner', async () => {
    inActions();
    process.env.APPSHELL_TOKEN = 'explicit';

    await handler(publishArgs());

    expect(get).not.toHaveBeenCalled();
    expect(bearers()).toEqual(['Bearer explicit']);
    expect(output()).not.toContain('trusted publishing');
  });

  it('lets a stored credential win too, such as a client-credentials login earlier in the job', async () => {
    inActions();
    saveCredential(REGISTRY, { accessToken: 'stored', expiresAt: Date.now() + 60_000 });

    await handler(publishArgs());

    expect(get).not.toHaveBeenCalled();
    expect(bearers()).toEqual(['Bearer stored']);
  });

  it('does not try outside GitHub Actions', async () => {
    await handler(publishArgs());

    expect(get).not.toHaveBeenCalled();
    expect(bearers()).toEqual([undefined]);
  });

  it('says why when the runner will not mint a token', async () => {
    inActions();
    get.mockRejectedValue(refusal(500, 'boom'));

    await expect(handler(publishArgs())).rejects.toThrow(
      'Could not obtain an OIDC token from the GitHub Actions runner: 500 boom',
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('points a 403 at the trust records and the job environment, not at logging in', async () => {
    inActions();
    post.mockRejectedValue(
      refusal(
        403,
        "Workflow acme/widgets/.github/workflows/pipeline.yml in environment 'production' is " +
          "not a trusted publisher of scope 'acme'.",
      ),
    );

    const error = await handler(publishArgs()).catch((e: Error) => e);

    expect((error as Error).message).toMatch(/403 Workflow .* is not a trusted publisher/);
    expect((error as Error).message).toMatch(/appshell trust list acme.*environment/);
    expect((error as Error).message).not.toMatch(/appshell login/);
  });

  it('says the registry does not have trusted publishing enabled on that 401', async () => {
    inActions();
    post.mockRejectedValue(refusal(401, 'Trusted publishing is not enabled on this registry.'));

    const error = await handler(publishArgs()).catch((e: Error) => e);

    expect((error as Error).message).toMatch(
      /401 Trusted publishing is not enabled on this registry\. This registry does not have trusted publishing enabled/,
    );
    expect((error as Error).message).not.toMatch(/appshell login/);
  });

  /*
   * A registry running AUTH_MODE=none still recognises a GitHub token, and refuses it as
   * not enabled. A job with id-token: write used to publish to one without trouble.
   */
  it('publishes without a token when that registry turns out to need none', async () => {
    inActions();
    post
      .mockRejectedValueOnce(refusal(401, 'Trusted publishing is not enabled on this registry.'))
      .mockResolvedValueOnce({ data: { id: 'acme/widgets@1.2.3', created: true } });

    await handler(publishArgs());

    expect(bearers()).toEqual([`Bearer ${workflowToken('jti-1')}`, undefined]);
    expect(output()).toContain('Published acme/widgets@1.2.3');
  });

  it('names the audience on a 401 about it', async () => {
    inActions();
    post.mockRejectedValue(
      refusal(401, 'The workflow token is not valid: unexpected "aud" claim value'),
    );

    await expect(handler(publishArgs())).rejects.toThrow(
      `The token was minted for ${REGISTRY}, which must equal the registry's TRUSTED_PUBLISHING_AUDIENCE`,
    );
    expect(post).toHaveBeenCalledTimes(1);
  });

  /* The job simply has no token, so the registry only ever sees nothing. */
  it('mentions id-token: write on a 401 in Actions when the job was not granted it', async () => {
    inActions({ oidc: false });
    post.mockRejectedValue(refusal(401, 'A bearer token is required.'));

    await expect(handler(publishArgs())).rejects.toThrow(
      /appshell login.*permissions: id-token: write/,
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('keeps the usual advice outside Actions', async () => {
    post.mockRejectedValue(refusal(401, 'A bearer token is required.'));

    const error = await handler(publishArgs()).catch((e: Error) => e);

    expect((error as Error).message).toBe(
      'Failed to publish widgets@1.2.3: 401 A bearer token is required. Run `appshell login` or set APPSHELL_TOKEN.',
    );
  });
});
