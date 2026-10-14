/* eslint-disable no-console */
import axios from '../../../util/axios';
import { ensureToken } from '../../../util/credentials';
import { ApplicationResource } from '../../../util/registry';
import { applyResource, deployAudience, isDeploymentToken } from '../deploy';

// The runner's OIDC endpoint is asked with `get`; the registry, through RegistryClient, with
// `request`.
jest.mock('../../../util/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), request: jest.fn() },
}));
jest.mock('../../../util/credentials', () => ({ ensureToken: jest.fn() }));

const get = axios.get as jest.Mock;
const request = axios.request as jest.Mock;

const REGISTRY = 'https://registry.example.test';
const REQUEST_URL = 'https://pipelines.actions.test/oidc/token?api-version=2.0';

const RESOURCE: ApplicationResource = {
  apiVersion: 'registry.appshell.org/v1',
  kind: 'Application',
  name: 'acme/storefront',
  spec: { packages: ['acme/catalog@1.2.0'] },
};

/** An unsigned JWT: the cli decodes a job's claims for its log and nothing else. */
const jwt = (claims: Record<string, unknown>) =>
  ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.');

const JOB_TOKEN = jwt({
  repository: 'acme/deploy',
  job_workflow_ref: 'acme/deploy/.github/workflows/deploy.yml@refs/heads/main',
  environment: 'production',
});

const refusal = (status: number, message: string) => ({ response: { status, data: { message } } });

const ENV = [
  'ACTIONS_ID_TOKEN_REQUEST_URL',
  'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'APPSHELL_DEPLOY_AUDIENCE',
] as const;

/*
 * Trusted deployment from GitHub Actions, appshellhq/appshell-services#57: with no
 * credential of its own, a job granted `id-token: write` applies with a token the runner
 * mints for the registry's deploy audience — never its publishing one.
 */
describe('app apply, as a GitHub Actions job', () => {
  let logged: string[];
  const saved = ENV.map((name) => [name, process.env[name]] as const);

  const inActions = () => {
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL = REQUEST_URL;
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN = 'runner-request-token';
  };

  /** The Authorization header each registry request carried. */
  const bearers = () => request.mock.calls.map(([config]) => config.headers?.Authorization);

  /** The audience each token was minted for. */
  const audiences = () =>
    get.mock.calls.map(([url]) => decodeURIComponent(String(url).split('&audience=')[1]));

  beforeEach(() => {
    jest.clearAllMocks();
    ENV.forEach((name) => delete process.env[name]);
    logged = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      logged.push(args.join(' '));
    });
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    (ensureToken as jest.Mock).mockResolvedValue(undefined);
    get.mockResolvedValue({ data: { value: JOB_TOKEN } });
    request.mockResolvedValue({
      data: { id: 'acme/storefront', created: false, changes: [], message: 'ok' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    saved.forEach(([name, value]) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  });

  it("should apply with a token minted for the registry's deploy audience", async () => {
    inActions();

    await applyResource(REGISTRY, RESOURCE);

    expect(audiences()).toEqual([`${REGISTRY}/deploy`]);
    expect(bearers()).toEqual([`Bearer ${JOB_TOKEN}`]);
    expect(logged.join('\n')).toMatch(
      /Applying as acme\/deploy\/\.github\/workflows\/deploy\.yml@refs\/heads\/main, environment production/,
    );
  });

  /* An operator may give deployment an audience of its own. */
  it('should mint for APPSHELL_DEPLOY_AUDIENCE when set', async () => {
    inActions();
    process.env.APPSHELL_DEPLOY_AUDIENCE = 'https://deploy.example.test';

    await applyResource(REGISTRY, RESOURCE);

    expect(audiences()).toEqual(['https://deploy.example.test']);
  });

  /* Put there on purpose; the job's token is there whether anyone asked for it or not. */
  it('should apply with an explicit credential when there is one, minting nothing', async () => {
    inActions();
    (ensureToken as jest.Mock).mockResolvedValue('person-token');

    await applyResource(REGISTRY, RESOURCE);

    expect(get).not.toHaveBeenCalled();
    expect(bearers()).toEqual(['Bearer person-token']);
  });

  it('should apply as before outside GitHub Actions', async () => {
    await applyResource(REGISTRY, RESOURCE);

    expect(get).not.toHaveBeenCalled();
    expect(bearers()).toEqual([undefined]);
  });

  /* A workload can't log in; what refused it is a record, so that's what to check. */
  it('should point a refused job at the application’s trust records', async () => {
    inActions();
    request.mockRejectedValue(
      refusal(403, 'No trusted deployer on acme/storefront matches this workload.'),
    );

    const error = await applyResource(REGISTRY, RESOURCE).catch((e: Error) => e);

    expect(error.message).toMatch(/appshell trust list acme --application storefront/);
    expect(error.message).not.toMatch(/appshell login/);
  });

  it('should say a job applies only an application named with its scope', async () => {
    inActions();
    request.mockRejectedValue(
      refusal(403, "A deployment must name the application as 'scope/name'."),
    );

    await expect(applyResource(REGISTRY, { ...RESOURCE, name: 'storefront' })).rejects.toThrow(
      /names no scope/,
    );
  });

  it('should name the audience setting when the audience is refused', async () => {
    inActions();
    request.mockRejectedValue(refusal(401, 'The deployment token is not valid: unexpected "aud"'));

    await expect(applyResource(REGISTRY, RESOURCE)).rejects.toThrow(/APPSHELL_DEPLOY_AUDIENCE/);
  });

  /*
   * A registry with trusted deployment off reads the token as a publishing workflow's and
   * refuses it on apply. Every local registry is one, and needs no credential at all.
   */
  describe('against a registry with trusted deployment off', () => {
    const off = refusal(403, 'A workflow token may only be used to publish a package.');

    it('should apply again with no credential', async () => {
      inActions();
      request.mockRejectedValueOnce(off);

      await expect(applyResource(REGISTRY, RESOURCE)).resolves.toMatchObject({
        id: 'acme/storefront',
      });
      expect(bearers()).toEqual([`Bearer ${JOB_TOKEN}`, undefined]);
    });

    it('should say what to set when the registry needs a credential after all', async () => {
      inActions();
      request.mockRejectedValueOnce(off).mockRejectedValueOnce(refusal(401, 'Unauthorized'));

      await expect(applyResource(REGISTRY, RESOURCE)).rejects.toThrow(
        /trusted deployment enabled.*TRUSTED_PUBLISHING_AUDIENCE/,
      );
    });
  });

  /*
   * A Kubernetes workload passes its projected token as APPSHELL_TOKEN. It's still a
   * workload's token, so a refusal gets workload advice rather than "log in".
   */
  describe('with a workload token given explicitly', () => {
    const projected = jwt({
      aud: [`${REGISTRY}/deploy`],
      sub: 'system:serviceaccount:apps:deployer',
    });

    beforeEach(() => {
      (ensureToken as jest.Mock).mockResolvedValue(projected);
    });

    it('should apply with it, minting nothing', async () => {
      inActions();

      await applyResource(REGISTRY, RESOURCE);

      expect(get).not.toHaveBeenCalled();
      expect(bearers()).toEqual([`Bearer ${projected}`]);
    });

    it('should point a refusal at the trust records, not at logging in', async () => {
      request.mockRejectedValue(refusal(403, 'No trusted deployer on acme/storefront matches.'));

      const error = await applyResource(REGISTRY, RESOURCE).catch((e: Error) => e);

      expect(error.message).toMatch(/appshell trust list acme --application storefront/);
      expect(error.message).not.toMatch(/appshell login/);
    });

    it('should name the audience setting when the audience is refused', async () => {
      request.mockRejectedValue(
        refusal(401, 'The deployment token is not valid: unexpected "aud"'),
      );

      const error = await applyResource(REGISTRY, RESOURCE).catch((e: Error) => e);

      expect(error.message).toMatch(/APPSHELL_DEPLOY_AUDIENCE/);
      expect(error.message).not.toMatch(/appshell login/);
    });
  });

  describe('isDeploymentToken', () => {
    const audience = `${REGISTRY}/deploy`;

    it('should know a token by its audience, as a string or a list', () => {
      expect(isDeploymentToken(jwt({ aud: audience }), audience)).toBe(true);
      expect(isDeploymentToken(jwt({ aud: ['other', audience] }), audience)).toBe(true);
    });

    it('should not take a person’s token, or something that is not a JWT, for one', () => {
      expect(isDeploymentToken(jwt({ aud: 'appshell-cli' }), audience)).toBe(false);
      expect(isDeploymentToken('opaque-api-key', audience)).toBe(false);
    });
  });

  describe('deployAudience', () => {
    it("should be the registry's url, without a trailing slash, and /deploy", () => {
      expect(deployAudience('https://registry.example.test/')).toBe(
        'https://registry.example.test/deploy',
      );
    });
  });
});
