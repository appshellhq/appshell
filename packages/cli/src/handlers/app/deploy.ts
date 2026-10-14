/* eslint-disable no-console */
import chalk from 'chalk';
import { ensureToken } from '../../util/credentials';
import {
  actionsToken,
  actionsTokenAvailable,
  WorkflowClaims,
  workflowClaims,
} from '../../util/github';
import {
  ApplicationResource,
  ApplyResult,
  detailOf,
  RegistryClient,
  statusOf,
} from '../../util/registry';

/*
 * Trusted deployment from the cli: `appshell app apply` in a GitHub Actions job applies as
 * that job, with its own OIDC token, when a trusted-deployer record on the application says
 * it may. appshellhq/appshell-services#57.
 *
 * In a Kubernetes pod there is nothing to mint: the kubelet projects the token into a file,
 * and APPSHELL_TOKEN=$(cat <that file>) presents it like any other explicit token.
 */

/*
 * What the registry says to a workflow token on a route that isn't for publishing — which
 * is what a deployment token becomes when trusted deployment is off: unrecognised by its
 * audience, it's read as a publishing workflow's, and refused here.
 */
const DEPLOYMENT_OFF = /only be used to publish/i;

/**
 * The audience a deployment token is minted for: APPSHELL_DEPLOY_AUDIENCE when set, which is
 * a registry's TRUSTED_DEPLOYMENT_AUDIENCE when its operator set one, and otherwise what the
 * registry defaults that to — its publishing audience, which is its url, with `/deploy`.
 *
 * Never the publishing audience itself: the registry refuses a deployment token minted for
 * it, so a token minted for one job can't do the other's.
 */
export const deployAudience = (registry: string): string =>
  process.env.APPSHELL_DEPLOY_AUDIENCE?.trim() || `${registry.replace(/\/+$/, '')}/deploy`;

/**
 * Whether a credential is a workload's deployment token — a Kubernetes projected token
 * passed as APPSHELL_TOKEN, say — by the audience it was minted for. Decoded, not verified:
 * it only decides which advice a refusal gets, and the registry verifies.
 */
export const isDeploymentToken = (token: string, audience: string): boolean => {
  try {
    const { aud } = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf-8'),
    ) as { aud?: unknown };

    return Array.isArray(aud) ? aud.includes(audience) : aud === audience;
  } catch {
    return false;
  }
};

/** The job as a trust record sees it, for the log: which workflow, at which ref, where. */
const describeJob = ({ job_workflow_ref: ref, repository, environment }: WorkflowClaims) => {
  const who = ref ?? repository ?? 'this workflow';

  return environment ? `${who}, environment ${environment}` : who;
};

/** A refusal of a workflow's apply, with what to check instead of telling it to log in. */
const refusal = (resource: ApplicationResource, audience: string, error: unknown) => {
  const detail = detailOf(error);
  const [scope, name] = resource.name.includes('/') ? resource.name.split('/') : [];
  let advice = '';

  if (statusOf(error) === 403) {
    advice = scope
      ? `Check \`appshell trust list ${scope} --application ${name}\` against this job's ` +
        `repository, workflow file and environment.`
      : `A workload applies an application named as scope/name; ${resource.name} names no scope.`;
  } else if (statusOf(error) === 401 && /\baud\b|audience/i.test(detail)) {
    advice =
      `The token was minted for ${audience}, which must be the registry's ` +
      `TRUSTED_DEPLOYMENT_AUDIENCE: set APPSHELL_DEPLOY_AUDIENCE to it.`;
  }

  return new Error(`Failed to apply ${resource.name}: ${detail}${advice ? ` ${advice}` : ''}`);
};

/**
 * Applies a resource, as the caller or — in a GitHub Actions job granted `id-token: write`,
 * with no credential of its own — as the job.
 *
 * An explicit credential wins, as for publishing: APPSHELL_TOKEN, or a stored login, was
 * put there on purpose, and a job's OIDC token is there whether anyone asked for it or not.
 *
 * The job's token is minted per apply and never stored. For a registry with trusted
 * deployment off — AUTH_MODE=none, every local one — the apply is retried with no credential
 * at all, which such a registry accepts; if that is refused too, the first refusal is the
 * one reported, since it says why the token wasn't taken.
 */
export const applyResource = async (
  registry: string,
  resource: ApplicationResource,
): Promise<ApplyResult> => {
  const client = new RegistryClient(registry);
  const audience = deployAudience(registry);
  const explicit = await ensureToken(registry);

  // A workload's token given explicitly — the Kubernetes way — is still a workload's: its
  // refusals are about trust records and audiences, never about logging in.
  if (explicit && isDeploymentToken(explicit, audience)) {
    try {
      return await client.applyAs(resource, explicit);
    } catch (error) {
      throw refusal(resource, audience, error);
    }
  }

  if (explicit || !actionsTokenAvailable()) {
    return client.apply(resource);
  }

  const token = await actionsToken(audience);

  console.log(
    chalk.blue(`Applying as ${describeJob(workflowClaims(token))}, via trusted deployment`),
  );

  try {
    return await client.applyAs(resource, token);
  } catch (error) {
    if (statusOf(error) !== 403 || !DEPLOYMENT_OFF.test(detailOf(error))) {
      throw refusal(resource, audience, error);
    }

    console.log(
      chalk.dim('The registry does not have trusted deployment enabled; trying without a token.'),
    );

    try {
      return await client.applyAs(resource, null);
    } catch (anonymous) {
      throw statusOf(anonymous) === 401
        ? new Error(
            `Failed to apply ${resource.name}: this registry does not have trusted deployment ` +
              'enabled, and needs a credential. Its operator sets TRUSTED_PUBLISHING_AUDIENCE ' +
              '(or TRUSTED_DEPLOYMENT_AUDIENCE); until then, apply with APPSHELL_TOKEN.',
          )
        : refusal(resource, audience, anonymous);
    }
  }
};
