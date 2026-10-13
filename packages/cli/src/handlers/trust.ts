/* eslint-disable no-console */
import chalk from 'chalk';
import { GlobalArgs } from '../util/args';
import { GITHUB_ACTIONS_ISSUER, GITHUB_API, repositoryIds } from '../util/github';
import {
  AddTrustedDeployerBody,
  RegistryClient,
  TrustedDeployer,
  TrustedPublisher,
} from '../util/registry';

/*
 * `application` turns every command from the scope's trusted publishers to one
 * application's trusted deployers: workloads that may apply it. appshellhq/
 * appshell-services#57.
 */
type TrustArgs = GlobalArgs & { scope: string; application?: string };

export type TrustAddArgs = TrustArgs & {
  github?: string;
  workflow?: string;
  environment?: string;
  issuer?: string;
  githubApi?: string;
  /** A cluster's OIDC issuer, for a Kubernetes service account. Deployment only. */
  kubernetes?: string;
  namespace?: string;
  serviceAccount?: string;
};

export type TrustRemoveArgs = TrustArgs & { id: string };

/*
 * Trusted publishing: a CI workflow publishes into a scope with its own OIDC identity, which
 * the registry verifies itself, against records on the scope saying which workflows may.
 * Nothing is stored and nothing is rotated, and a scope's owner sets it up without asking
 * anyone. These commands manage the records; `appshell publish` is what presents the token.
 * appshellhq/appshell-services#51.
 */

/**
 * The workflow as the registry stores it: its path within the repository.
 *
 * Taken bare as well, because the file name is what anyone has in mind — and GitHub runs
 * workflows only from `.github/workflows` — that directory itself, not below it — so a bare
 * name can only mean one place. Anything else, a subdirectory or a `..`, could never match a
 * token, so it is refused here rather than stored.
 */
export const workflowPath = (workflow: string): string => {
  const given = workflow.trim().replace(/^\.\//, '');
  const full = given.includes('/') ? given : `.github/workflows/${given}`;

  if (!/^\.github\/workflows\/[A-Za-z0-9._-]+\.ya?ml$/.test(full)) {
    throw new Error(
      `--workflow names a workflow file, as pipeline.yml or .github/workflows/pipeline.yml; ` +
        `got '${workflow}'.`,
    );
  }

  return full;
};

const shortId = (id: string) => id.slice(0, 8);

/** How `list` shows a record that names no environment, explained under the table. */
const UNRESTRICTED = '*';

/**
 * The GitHub instance a record is for: the api its ids are looked up on, and the issuer its
 * tokens come from. One instance, never a mix.
 *
 * Repository and owner ids mean something only within the instance that issued them. Taken
 * separately, an Enterprise Server api with github.com's issuer would store that server's ids
 * against github.com's tokens, and the github.com repository that happens to share them would
 * be trusted. So the two are both left at github.com's, or both given and naming one host:
 * an Enterprise Server's api is https://<host>/api/v3 and its issuer
 * https://<host>/_services/token.
 */
export const githubInstance = (
  githubApi?: string,
  issuerGiven?: string,
): { api: string; issuer?: string } => {
  const api = githubApi?.replace(/\/+$/, '');
  // Without its trailing slash, as tokens carry it: the registry compares issuers exactly, so
  // `…/_services/token/` would store a record no token could ever match.
  const issuer = issuerGiven?.replace(/\/+$/, '');

  if (!api && !issuer) {
    return { api: GITHUB_API };
  }

  if (!api || !issuer) {
    throw new Error(
      '--github-api and --issuer name one GitHub instance together; give both, or neither for ' +
        'github.com. An Enterprise Server is https://<host>/api/v3 with ' +
        'https://<host>/_services/token.',
    );
  }

  const github = api === GITHUB_API && issuer === GITHUB_ACTIONS_ISSUER;
  const sameHost = (() => {
    try {
      return new URL(api).host === new URL(issuer).host;
    } catch {
      return false;
    }
  })();

  if (!github && !sameHost) {
    throw new Error(
      `--github-api (${api}) and --issuer (${issuer}) are different GitHub instances. ` +
        "A repository's ids mean something only on the instance that issued them.",
    );
  }

  return { api, issuer };
};

/** Only worth saying when it is not GitHub's own: that is the case someone set on purpose. */
const customIssuer = (publisher: TrustedPublisher) =>
  publisher.issuer && publisher.issuer !== GITHUB_ACTIONS_ISSUER ? publisher.issuer : undefined;

/**
 * Trusts a workflow to publish into a scope.
 *
 * The repository is resolved to GitHub's immutable ids here, before anything reaches the
 * registry, because a record matches on ids and never on the name: a renamed or
 * transferred repository, or a new one squatting the old name, must not inherit it.
 *
 * Leaving the environment out is allowed, and called out when chosen. An environment is
 * what lets GitHub's own protection rules — required reviewers, branch restrictions —
 * decide which runs can mint the token at all, before the registry sees anything.
 */
/**
 * The application `--application` names, within the scope given positionally. `scope/name`
 * is accepted too, as long as it's the same scope: a record lives on one application, and a
 * command naming two scopes would have to guess which was meant.
 */
export const applicationIn = (scope: string, application: string): string => {
  const [given, name] = application.includes('/')
    ? application.split('/', 2)
    : [scope, application];

  if (given !== scope) {
    throw new Error(
      `--application ${application} is in ${given}, not ${scope}. Name it as ${name}, in the ` +
        `scope given before it.`,
    );
  }

  // The registry's own rule for an application name.
  if (!name || !/^[a-z0-9][a-z0-9-_.]*$/.test(name)) {
    throw new Error(`--application names an application, as storefront; got '${application}'.`);
  }

  return name;
};

/** A GitHub workflow, as a publisher or deployer record names it. */
const githubWorkflow = async (argv: TrustAddArgs) => {
  if (!argv.github || !argv.workflow) {
    throw new Error('--github and --workflow name the workflow to trust; give both.');
  }

  const workflow = workflowPath(argv.workflow);
  const { environment } = argv;

  // Refused rather than dropped. A blank `--environment` read as none would turn a grant
  // meant to require an environment into one that matches every run — the widening the
  // registry refuses a blank name to prevent.
  if (environment !== undefined && !environment.trim()) {
    throw new Error('--environment needs a name. Leave it out to trust any environment.');
  }

  const instance = githubInstance(argv.githubApi, argv.issuer);
  const ids = await repositoryIds(argv.github, instance.api);

  return {
    provider: 'github' as const,
    ...ids,
    workflow,
    ...(environment ? { environment } : {}),
    ...(instance.issuer ? { issuer: instance.issuer } : {}),
  };
};

/**
 * A Kubernetes service account, under the issuer its cluster's projected tokens carry.
 *
 * The issuer is taken exactly as given — the registry compares it with each token's `iss`
 * character for character, so it must be what the cluster's `--service-account-issuer` is
 * (`kubectl get --raw /.well-known/openid-configuration` prints it), trailing slash and all.
 */
const kubernetesAccount = (argv: TrustAddArgs) => {
  if (!argv.namespace || !argv.serviceAccount) {
    throw new Error(
      '--kubernetes names the cluster; --namespace and --service-account name the account in it. ' +
        'Give all three.',
    );
  }

  return {
    provider: 'kubernetes' as const,
    issuer: argv.kubernetes as string,
    namespace: argv.namespace,
    serviceAccount: argv.serviceAccount,
  };
};

const describeDeployer = (deployer: TrustedDeployer) =>
  deployer.provider === 'kubernetes'
    ? `${deployer.namespace}/${deployer.serviceAccount}`
    : `${deployer.repository} ${deployer.workflow}`;

/**
 * Trusts a workload to apply one application. appshellhq/appshell-services#57.
 *
 * The application has to exist already: a person creates it, then decides what may keep it
 * up to date, as a scope has to exist before a workflow may publish into it.
 */
const addDeployer = async (argv: TrustAddArgs, name: string) => {
  const body: AddTrustedDeployerBody = argv.kubernetes
    ? kubernetesAccount(argv)
    : await githubWorkflow(argv);

  const client = new RegistryClient(argv.registry);
  const { deployer, created } = await client.addTrustedDeployer(argv.scope, name, body);
  const application = `${argv.scope}/${name}`;

  console.log(
    created
      ? chalk.green(`Trusted ${describeDeployer(deployer)} to apply ${application}`)
      : chalk.dim(`${describeDeployer(deployer)} was already trusted to apply ${application}`),
  );

  if (deployer.provider === 'kubernetes') {
    console.log(`  ${chalk.dim('namespace')}        ${deployer.namespace}`);
    console.log(`  ${chalk.dim('service account')}  ${deployer.serviceAccount}`);
  } else {
    console.log(`  ${chalk.dim('workflow')}         ${deployer.workflow}`);
    console.log(
      `  ${chalk.dim('environment')}      ${
        deployer.environment ?? chalk.yellow('any environment')
      }`,
    );
  }
  console.log(`  ${chalk.dim('issuer')}           ${deployer.issuer}`);
  console.log(`  ${chalk.dim('id')}               ${shortId(deployer.id)}`);

  if (deployer.provider === 'github' && !deployer.environment) {
    console.log(
      chalk.dim(
        'Any run of this workflow, from any branch, can apply. With --environment, its ' +
          'protection rules decide which can.',
      ),
    );
  }
};

export const add = async (argv: TrustAddArgs) => {
  if (argv.application) {
    await addDeployer(argv, applicationIn(argv.scope, argv.application));

    return;
  }

  // Publishing is GitHub's alone: the registry verifies no other workload for it.
  if (argv.kubernetes) {
    throw new Error(
      '--kubernetes trusts a service account to apply an application, so it needs ' +
        '--application. Publishing trusts GitHub workflows only.',
    );
  }

  const { provider, ...workflowRecord } = await githubWorkflow(argv);

  const client = new RegistryClient(argv.registry);
  const { publisher, created } = await client.addTrustedPublisher(argv.scope, {
    provider,
    ...workflowRecord,
  });

  console.log(
    created
      ? chalk.green(`Trusted ${publisher.repository} to publish into ${argv.scope}`)
      : chalk.dim(`${publisher.repository} was already trusted to publish into ${argv.scope}`),
  );
  console.log(`  ${chalk.dim('workflow')}     ${publisher.workflow}`);
  console.log(
    `  ${chalk.dim('environment')}  ${publisher.environment ?? chalk.yellow('any environment')}`,
  );
  console.log(`  ${chalk.dim('issuer')}       ${publisher.issuer}`);
  console.log(`  ${chalk.dim('id')}           ${shortId(publisher.id)}`);

  if (!publisher.environment) {
    console.log(
      chalk.dim(
        'Any run of this workflow, from any branch, can publish. With --environment, its ' +
          'protection rules decide which can.',
      ),
    );
  }
};

/** Rows padded into columns under a header, as `list` prints them. */
const table = (header: string[], rows: string[][]) => {
  const widths = header.map((title, column) =>
    Math.max(title.length, ...rows.map((row) => row[column].length)),
  );
  const line = (cells: string[]) =>
    `  ${cells.map((cell, column) => cell.padEnd(widths[column])).join('  ')}`.trimEnd();

  console.log(chalk.dim(line(header)));
  rows.forEach((row) => console.log(line(row)));
};

const listDeployers = async (argv: TrustArgs, name: string) => {
  const client = new RegistryClient(argv.registry);
  const deployers = await client.listTrustedDeployers(argv.scope, name);
  const application = `${argv.scope}/${name}`;

  if (!deployers.length) {
    console.log(
      chalk.dim(
        `No workload is trusted to apply ${application}. Add one with \`appshell trust add ` +
          `${argv.scope} --application ${name}\` and --github or --kubernetes.`,
      ),
    );

    return;
  }

  // One table, both kinds: WHO is the repository or the namespace/account, WHAT the workflow
  // and environment or nothing, so a refused apply is diagnosed by reading down one column.
  const rows = deployers.map((deployer) => [
    shortId(deployer.id),
    deployer.provider,
    deployer.provider === 'kubernetes'
      ? `${deployer.namespace}/${deployer.serviceAccount}`
      : (deployer.repository as string),
    deployer.provider === 'kubernetes'
      ? '-'
      : `${deployer.workflow} (${deployer.environment ?? UNRESTRICTED})`,
    deployer.issuer === GITHUB_ACTIONS_ISSUER ? 'github.com' : deployer.issuer,
    deployer.createdAt.slice(0, 10),
  ]);

  console.log(`\n${chalk.bold(`Workloads trusted to apply ${application}`)}\n`);
  table(['ID', 'PROVIDER', 'WHO', 'WORKFLOW (ENVIRONMENT)', 'ISSUER', 'CREATED'], rows);
  if (deployers.some((deployer) => deployer.provider === 'github' && !deployer.environment)) {
    console.log(chalk.dim(`\n  ${UNRESTRICTED}  any environment, or none: not restricted to one`));
  }
  console.log();
};

export const list = async (argv: TrustArgs) => {
  if (argv.application) {
    await listDeployers(argv, applicationIn(argv.scope, argv.application));

    return;
  }

  const client = new RegistryClient(argv.registry);
  const publishers = await client.listTrustedPublishers(argv.scope);

  if (!publishers.length) {
    console.log(
      chalk.dim(
        `No workflow is trusted to publish into ${argv.scope}. Add one with \`appshell trust ` +
          `add ${argv.scope} --github <owner/repo> --workflow <file>\`.`,
      ),
    );

    return;
  }

  // The issuer column only appears when some record names an issuer other than GitHub's,
  // which is an Enterprise Server: everywhere else it would be the same url on every row.
  const showIssuer = publishers.some(customIssuer);
  const rows = publishers.map((publisher) => [
    shortId(publisher.id),
    publisher.repository,
    publisher.workflow,
    // `*`, not "any": a record restricted to an environment named `any` has to look different
    // from one restricted to none, since this table is where a refused publish is diagnosed.
    publisher.environment ?? UNRESTRICTED,
    ...(showIssuer ? [customIssuer(publisher) ?? 'github.com'] : []),
    publisher.createdAt.slice(0, 10),
  ]);
  const header = [
    'ID',
    'REPOSITORY',
    'WORKFLOW',
    'ENVIRONMENT',
    ...(showIssuer ? ['ISSUER'] : []),
    'CREATED',
  ];
  console.log(`\n${chalk.bold(`Workflows trusted to publish into ${argv.scope}`)}\n`);
  table(header, rows);
  if (publishers.some((publisher) => !publisher.environment)) {
    console.log(chalk.dim(`\n  ${UNRESTRICTED}  any environment, or none: not restricted to one`));
  }
  console.log();
};

/**
 * Stops trusting a workflow, which is the whole of revocation: there is no secret to rotate
 * and nothing left behind to chase.
 *
 * Takes the id as `trust list` prints it, shortened, as well as whole — resolved against
 * the scope's records, the way git resolves an abbreviated commit, and refused when it is
 * ambiguous rather than guessed.
 */
/** An id as `list` shows it, shortened or whole, resolved like an abbreviated commit. */
const resolveId = <T extends { id: string }>(
  records: T[],
  id: string,
  missing: string,
  kind: string,
) => {
  const matches = records.filter((record) => record.id.startsWith(id));

  if (!matches.length) throw new Error(missing);

  if (matches.length > 1) {
    throw new Error(`${id} matches ${matches.length} ${kind}; give more of the id.`);
  }

  return matches[0];
};

const removeDeployer = async (argv: TrustRemoveArgs, name: string) => {
  const client = new RegistryClient(argv.registry);
  const application = `${argv.scope}/${name}`;
  const deployer = resolveId(
    await client.listTrustedDeployers(argv.scope, name),
    argv.id,
    `No workload trusted to apply ${application} has the id ${argv.id}. ` +
      `\`appshell trust list ${argv.scope} --application ${name}\` shows them.`,
    `trusted deployers of ${application}`,
  );

  await client.removeTrustedDeployer(argv.scope, name, deployer.id);

  console.log(
    chalk.green(`Removed ${shortId(deployer.id)}`) + chalk.dim(` — ${describeDeployer(deployer)}`),
  );
};

export const remove = async (argv: TrustRemoveArgs) => {
  if (argv.application) {
    await removeDeployer(argv, applicationIn(argv.scope, argv.application));

    return;
  }

  const client = new RegistryClient(argv.registry);
  const publishers = await client.listTrustedPublishers(argv.scope);
  const matches = publishers.filter((publisher) => publisher.id.startsWith(argv.id));

  if (!matches.length) {
    throw new Error(
      `No workflow trusted to publish into ${argv.scope} has the id ${argv.id}. ` +
        `\`appshell trust list ${argv.scope}\` shows them.`,
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `${argv.id} matches ${matches.length} trusted publishers of ${argv.scope}; give more of ` +
        `the id.`,
    );
  }

  const [publisher] = matches;

  await client.removeTrustedPublisher(argv.scope, publisher.id);

  // Says what the record was rather than that the workflow can no longer publish: another
  // record, for another environment, may still let it.
  console.log(
    chalk.green(`Removed ${shortId(publisher.id)}`) +
      chalk.dim(
        ` — ${publisher.repository} ${publisher.workflow}, ` +
          `${publisher.environment ? `environment ${publisher.environment}` : 'any environment'}`,
      ),
  );
};
