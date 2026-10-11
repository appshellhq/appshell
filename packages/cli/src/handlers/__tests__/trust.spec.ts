/* eslint-disable no-console */
import axios from '../../util/axios';
import { ensureToken } from '../../util/credentials';
import { add, githubInstance, list, remove, workflowPath } from '../trust';

jest.mock('../../util/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), request: jest.fn() },
}));
jest.mock('../../util/credentials', () => ({ ensureToken: jest.fn() }));

// GitHub is asked with `get`; the registry, through RegistryClient, with `request`.
const get = axios.get as jest.Mock;
const request = axios.request as jest.Mock;

const registry = 'https://registry.example.test';
const ID = '1b2c3d4e-0000-4000-8000-000000000001';

const record = (over: Record<string, unknown> = {}) => ({
  id: ID,
  scopeId: 'acme',
  provider: 'github',
  issuer: 'https://token.actions.githubusercontent.com',
  repository: 'acme/widgets',
  repositoryId: '123',
  repositoryOwnerId: '456',
  workflow: '.github/workflows/pipeline.yml',
  createdAt: '2026-10-11T09:00:00.000Z',
  createdBy: { id: 'user-1', username: 'owner' },
  ...over,
});

const repo = { data: { id: 123, full_name: 'acme/widgets', owner: { id: 456, login: 'acme' } } };

/*
 * Trusted publishing, appshellhq/appshell-services#51. The registry stores the repository
 * ids it is given and cannot look them up itself, so resolving owner/repo to them is the
 * one thing here that has to be right for a record to ever match.
 */
describe('appshell trust', () => {
  let logged: string[];
  const saved = { GITHUB_TOKEN: process.env.GITHUB_TOKEN, GH_TOKEN: process.env.GH_TOKEN };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    logged = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      logged.push(args.join(' '));
    });
    // RegistryClient logs each request for --verbose.
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    (ensureToken as jest.Mock).mockResolvedValue('person-token');
    get.mockResolvedValue(repo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.entries(saved).forEach(([name, value]) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  });

  const output = () => logged.join('\n');

  describe('workflowPath', () => {
    it('takes a bare file name as one in .github/workflows', () => {
      expect(workflowPath('pipeline.yml')).toBe('.github/workflows/pipeline.yml');
      expect(workflowPath('release.yaml')).toBe('.github/workflows/release.yaml');
    });

    it('keeps a full path, with or without a leading ./', () => {
      expect(workflowPath('.github/workflows/pipeline.yml')).toBe('.github/workflows/pipeline.yml');
      expect(workflowPath('./.github/workflows/pipeline.yml')).toBe(
        '.github/workflows/pipeline.yml',
      );
    });

    /* GitHub runs workflows from .github/workflows itself, not below it. */
    it('refuses a subdirectory or a traversal, which no workflow token could name', () => {
      expect(() => workflowPath('.github/workflows/sub/release.yml')).toThrow(
        /--workflow names a workflow file/,
      );
      expect(() => workflowPath('.github/workflows/../release.yml')).toThrow(
        /--workflow names a workflow file/,
      );
    });

    /* GitHub runs nothing from anywhere else, so such a record could never match. */
    it('refuses a path outside .github/workflows, or a name that is not a workflow file', () => {
      expect(() => workflowPath('ci/pipeline.yml')).toThrow(/--workflow names a workflow file/);
      expect(() => workflowPath('pipeline')).toThrow(/--workflow names a workflow file/);
    });
  });

  /*
   * Repository ids mean something only on the instance that issued them, so the api they
   * are looked up on and the issuer the record trusts must be one instance.
   */
  describe('githubInstance', () => {
    it("is github.com's when neither is given", () => {
      expect(githubInstance()).toEqual({ api: 'https://api.github.com' });
    });

    it('takes an Enterprise Server when both name its host', () => {
      expect(
        githubInstance(
          'https://ghes.example.test/api/v3/',
          'https://ghes.example.test/_services/token',
        ),
      ).toEqual({
        api: 'https://ghes.example.test/api/v3',
        issuer: 'https://ghes.example.test/_services/token',
      });
    });

    it("accepts github.com's api and issuer named explicitly", () => {
      expect(
        githubInstance('https://api.github.com', 'https://token.actions.githubusercontent.com'),
      ).toEqual({
        api: 'https://api.github.com',
        issuer: 'https://token.actions.githubusercontent.com',
      });
    });

    /* Tokens carry the issuer without one, and the registry compares exactly. */
    it("drops the issuer's trailing slash, as its tokens carry it", () => {
      expect(
        githubInstance(
          'https://ghes.example.test/api/v3',
          'https://ghes.example.test/_services/token/',
        ).issuer,
      ).toBe('https://ghes.example.test/_services/token');
      expect(() =>
        githubInstance('https://api.github.com', 'https://token.actions.githubusercontent.com/'),
      ).not.toThrow();
    });

    it('refuses one without the other', () => {
      expect(() => githubInstance('https://ghes.example.test/api/v3')).toThrow(/give both/);
      expect(() => githubInstance(undefined, 'https://ghes.example.test/_services/token')).toThrow(
        /give both/,
      );
    });

    it('refuses two different instances', () => {
      expect(() =>
        githubInstance(
          'https://ghes.example.test/api/v3',
          'https://token.actions.githubusercontent.com',
        ),
      ).toThrow(/different GitHub instances/);
    });
  });

  describe('add', () => {
    const args = {
      registry,
      scope: 'acme',
      github: 'acme/widgets',
      workflow: 'pipeline.yml',
      environment: 'production',
    };

    beforeEach(() => {
      request.mockResolvedValue({
        data: { publisher: record({ environment: 'production' }), created: true },
      });
    });

    it('resolves the repository to its ids on GitHub, anonymously when no token is set', async () => {
      await add(args);

      expect(get).toHaveBeenCalledWith('https://api.github.com/repos/acme/widgets', {
        headers: { Accept: 'application/vnd.github+json' },
      });
    });

    it('sends the ids, the full workflow path and the environment to the registry', async () => {
      await add(args);

      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
          url: `${registry}/v1/scopes/acme/trusted-publishers`,
          headers: { Authorization: 'Bearer person-token' },
          data: {
            provider: 'github',
            repository: 'acme/widgets',
            repositoryId: '123',
            repositoryOwnerId: '456',
            workflow: '.github/workflows/pipeline.yml',
            environment: 'production',
          },
        }),
      );
    });

    /* A private repository is invisible to an anonymous request. */
    it('sends GITHUB_TOKEN to GitHub when it is set', async () => {
      process.env.GITHUB_TOKEN = 'gh-secret';

      await add(args);

      expect(get.mock.calls[0][1].headers.Authorization).toBe('Bearer gh-secret');
    });

    it('falls back to GH_TOKEN, as gh names it', async () => {
      process.env.GH_TOKEN = 'gh-cli-secret';

      await add(args);

      expect(get.mock.calls[0][1].headers.Authorization).toBe('Bearer gh-cli-secret');
    });

    it('looks up on an Enterprise Server api, and sends its issuer, when told to', async () => {
      await add({
        ...args,
        githubApi: 'https://ghes.example.test/api/v3/',
        issuer: 'https://ghes.example.test/_services/token',
      });

      expect(get.mock.calls[0][0]).toBe('https://ghes.example.test/api/v3/repos/acme/widgets');
      expect(request.mock.calls[0][0].data.issuer).toBe(
        'https://ghes.example.test/_services/token',
      );
    });

    it('omits the environment and the issuer when neither is given', async () => {
      request.mockResolvedValue({ data: { publisher: record(), created: true } });

      await add({ ...args, environment: undefined });

      expect(request.mock.calls[0][0].data).not.toHaveProperty('environment');
      expect(request.mock.calls[0][0].data).not.toHaveProperty('issuer');
    });

    it('says a 404 may be a private repository without a token, or a typo', async () => {
      get.mockRejectedValue({ response: { status: 404, data: { message: 'Not Found' } } });

      await expect(add(args)).rejects.toThrow(
        /GitHub has no repository acme\/widgets.*spelling.*GITHUB_TOKEN/,
      );
      expect(request).not.toHaveBeenCalled();
    });

    it("surfaces GitHub's own reason for any other failure", async () => {
      get.mockRejectedValue({
        response: { status: 403, data: { message: 'rate limit exceeded' } },
      });

      await expect(add(args)).rejects.toThrow(
        'Failed to look up acme/widgets on GitHub: 403 rate limit exceeded',
      );
    });

    it('refuses a repository not written as owner/repo before asking GitHub', async () => {
      await expect(add({ ...args, github: 'https://github.com/acme/widgets' })).rejects.toThrow(
        /owner\/repo/,
      );
      expect(get).not.toHaveBeenCalled();
    });

    /* Read as none, a blank name would widen a grant meant to require an environment. */
    it('refuses a blank environment rather than trusting every environment', async () => {
      await expect(add({ ...args, environment: '  ' })).rejects.toThrow(/--environment needs/);
      expect(request).not.toHaveBeenCalled();
    });

    it('prints what was trusted', async () => {
      await add(args);

      expect(output()).toContain('Trusted acme/widgets to publish into acme');
      expect(output()).toContain('.github/workflows/pipeline.yml');
      expect(output()).toContain('production');
      expect(output()).toContain('https://token.actions.githubusercontent.com');
      expect(output()).not.toMatch(/--environment/);
    });

    it('says "any environment", and recommends naming one, when none was given', async () => {
      request.mockResolvedValue({ data: { publisher: record(), created: true } });

      await add({ ...args, environment: undefined });

      expect(output()).toContain('any environment');
      expect(output()).toMatch(/With --environment/);
    });

    it('says so when the record already existed', async () => {
      request.mockResolvedValue({
        data: { publisher: record({ environment: 'production' }), created: false },
      });

      await add(args);

      expect(output()).toContain('acme/widgets was already trusted to publish into acme');
    });
  });

  describe('list', () => {
    it("reads the scope's records and prints them as a table", async () => {
      request.mockResolvedValue({
        data: [
          record({ environment: 'production' }),
          record({ id: 'ffffeeee-1', workflow: '.github/workflows/release.yml' }),
        ],
      });

      await list({ registry, scope: 'acme' });

      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          url: `${registry}/v1/scopes/acme/trusted-publishers`,
        }),
      );
      expect(output()).toMatch(
        /1b2c3d4e\s+acme\/widgets\s+\.github\/workflows\/pipeline\.yml\s+production\s+2026-10-11/,
      );
      expect(output()).toMatch(/ffffeeee\s+acme\/widgets\s+\.github\/workflows\/release\.yml\s+\*/);
      // `*`, explained: an environment literally named `any` must not read as unrestricted.
      expect(output()).toContain('any environment, or none');
      // GitHub's own issuer on every row says nothing, so there is no column for it.
      expect(output()).not.toContain('ISSUER');
      expect(output()).not.toContain(ID);
    });

    it('shows an issuer column only when a record names one other than github.com', async () => {
      request.mockResolvedValue({
        data: [
          record(),
          record({ id: 'ffffeeee-1', issuer: 'https://ghes.example.test/_services/token' }),
        ],
      });

      await list({ registry, scope: 'acme' });

      expect(output()).toContain('ISSUER');
      expect(output()).toContain('https://ghes.example.test/_services/token');
    });

    it('says how to add one when there are none', async () => {
      request.mockResolvedValue({ data: [] });

      await list({ registry, scope: 'acme' });

      expect(output()).toContain('appshell trust add acme --github');
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      request.mockImplementation(async ({ method }: { method: string }) =>
        method === 'get'
          ? { data: [record(), record({ id: 'ffffeeee-1' })] }
          : { data: { id: ID, message: 'Trusted publisher removed' } },
      );
    });

    it('deletes the record named by the short id list prints', async () => {
      await remove({ registry, scope: 'acme', id: '1b2c3d4e' });

      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          method: 'delete',
          url: `${registry}/v1/scopes/acme/trusted-publishers/${ID}`,
        }),
      );
      expect(output()).toContain('Removed 1b2c3d4e');
    });

    it('takes the whole id too', async () => {
      await remove({ registry, scope: 'acme', id: ID });

      expect(request.mock.calls[1][0].url).toBe(
        `${registry}/v1/scopes/acme/trusted-publishers/${ID}`,
      );
    });

    it('refuses an id that matches nothing, and deletes nothing', async () => {
      await expect(remove({ registry, scope: 'acme', id: '0000' })).rejects.toThrow(
        /appshell trust list acme/,
      );
      expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'delete' }));
    });

    it('refuses an ambiguous prefix rather than guessing', async () => {
      request.mockResolvedValue({ data: [record({ id: 'abc-1' }), record({ id: 'abc-2' })] });

      await expect(remove({ registry, scope: 'acme', id: 'abc' })).rejects.toThrow(/matches 2/);
      expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'delete' }));
    });
  });
});
