import axios from './axios';

/** Where `trust add` looks a repository up unless told otherwise. */
export const GITHUB_API = 'https://api.github.com';

/** GitHub Actions' OIDC issuer on github.com: a trust record's issuer unless it names another. */
export const GITHUB_ACTIONS_ISSUER = 'https://token.actions.githubusercontent.com';

/** A repository as the registry matches it: by the ids GitHub never reassigns. */
export type RepositoryIds = {
  /** `owner/repo` as GitHub spells it now, which is what a token's `repository` claim says. */
  repository: string;
  repositoryId: string;
  repositoryOwnerId: string;
};

/** What a GitHub api error says, when it says anything. */
const reasonOf = (error: unknown) => {
  const { response } = error as { response?: { status: number; data?: { message?: string } } };

  return response
    ? `${response.status} ${response.data?.message ?? ''}`.trim()
    : (error as Error).message;
};

/**
 * `owner/repo`, resolved to the immutable ids a trust record matches on.
 *
 * By id because names move: a renamed or transferred repository, or a new one squatting the
 * old name, must not inherit the trust. The registry stores the ids it is given and cannot
 * look them up itself, so this is the one place a name becomes an identity — and a wrong
 * id fails safe, as a record that never matches anything.
 *
 * GITHUB_TOKEN, or GH_TOKEN as `gh` names it, is sent when set. A private repository is a
 * 404 without one, indistinguishable from a typo, which is why the error says both.
 */
export const repositoryIds = async (
  repository: string,
  api: string = GITHUB_API,
): Promise<RepositoryIds> => {
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repository)) {
    throw new Error(`--github takes a repository as owner/repo; got '${repository}'.`);
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  try {
    const { data } = await axios.get<{ id: number; full_name: string; owner: { id: number } }>(
      `${api.replace(/\/+$/, '')}/repos/${repository}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    return {
      repository: data.full_name ?? repository,
      repositoryId: String(data.id),
      repositoryOwnerId: String(data.owner.id),
    };
  } catch (error) {
    if ((error as { response?: { status: number } }).response?.status === 404) {
      throw new Error(
        `GitHub has no repository ${repository} that this request can see. Check the ` +
          `spelling, or if it is private, set GITHUB_TOKEN (or GH_TOKEN) to a token that can ` +
          `read it.`,
      );
    }

    throw new Error(`Failed to look up ${repository} on GitHub: ${reasonOf(error)}`);
  }
};

/** Whether this process is a GitHub Actions job at all. */
export const inGitHubActions = () => process.env.GITHUB_ACTIONS === 'true';

/**
 * Whether the runner will mint this job an OIDC token. It does only for a job granted
 * `permissions: id-token: write`; otherwise neither variable is set.
 */
export const actionsTokenAvailable = () =>
  Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN);

/**
 * A fresh OIDC token for this job, minted by the runner for `audience`.
 *
 * Built the way @actions/core's `getIDToken` builds it — the request url already carries a
 * query string, and the audience is appended to it encoded — rather than depending on that
 * package for one GET.
 *
 * Never stored, never reused. The registry spends a token's `jti` on first use, so each
 * publish asks for its own; and a token minted for the registry is a credential to publish
 * into whatever scope trusts this workflow, which is no reason to keep it anywhere.
 */
export const actionsToken = async (audience: string): Promise<string> => {
  const url = `${process.env.ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${encodeURIComponent(
    audience,
  )}`;

  try {
    const { data } = await axios.get<{ value?: string }>(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`,
      },
    });

    if (!data?.value) {
      throw new Error('the runner answered without a token');
    }

    return data.value;
  } catch (error) {
    throw new Error(
      `Could not obtain an OIDC token from the GitHub Actions runner: ${reasonOf(error)}`,
    );
  }
};

/** The claims of a workflow token this cli reports, none of which it decides anything on. */
export type WorkflowClaims = {
  repository?: string;
  /** `owner/repo/.github/workflows/file.yml@ref` — which workflow, at which ref. */
  job_workflow_ref?: string;
  environment?: string;
};

/**
 * What a workflow token says about the job that minted it. Decoded, not verified: it is
 * for the job log, so a misconfigured trust record is obvious from what the cli said it
 * was publishing as. The registry verifies; nothing here is a decision.
 */
export const workflowClaims = (token: string): WorkflowClaims => {
  try {
    const [, payload] = token.split('.');

    return JSON.parse(Buffer.from(payload ?? '', 'base64url').toString('utf-8')) as WorkflowClaims;
  } catch {
    return {};
  }
};
