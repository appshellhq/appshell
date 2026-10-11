/* eslint-disable no-console */
import chalk from 'chalk';
import { GlobalArgs } from '../util/args';
import { GITHUB_ACTIONS_ISSUER, GITHUB_API, repositoryIds } from '../util/github';
import { RegistryClient, TrustedPublisher } from '../util/registry';

type TrustArgs = GlobalArgs & { scope: string };

export type TrustAddArgs = TrustArgs & {
  github: string;
  workflow: string;
  environment?: string;
  issuer?: string;
  githubApi?: string;
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
 * workflows only from `.github/workflows`, so a bare name can only mean one place. A path
 * anywhere else could never match a token, so it is refused here rather than stored.
 */
export const workflowPath = (workflow: string): string => {
  const given = workflow.trim().replace(/^\.\//, '');
  const full = given.includes('/') ? given : `.github/workflows/${given}`;

  if (!/^\.github\/workflows\/[A-Za-z0-9._\-/]+\.ya?ml$/.test(full)) {
    throw new Error(
      `--workflow names a workflow file, as pipeline.yml or .github/workflows/pipeline.yml; ` +
        `got '${workflow}'.`,
    );
  }

  return full;
};

const shortId = (id: string) => id.slice(0, 8);

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
export const add = async (argv: TrustAddArgs) => {
  const workflow = workflowPath(argv.workflow);
  const { environment } = argv;

  // Refused rather than dropped. A blank `--environment` read as none would turn a grant
  // meant to require an environment into one that matches every run — the widening the
  // registry refuses a blank name to prevent.
  if (environment !== undefined && !environment.trim()) {
    throw new Error('--environment needs a name. Leave it out to trust any environment.');
  }

  const ids = await repositoryIds(argv.github, argv.githubApi ?? GITHUB_API);

  const client = new RegistryClient(argv.registry);
  const { publisher, created } = await client.addTrustedPublisher(argv.scope, {
    provider: 'github',
    ...ids,
    workflow,
    ...(environment ? { environment } : {}),
    ...(argv.issuer ? { issuer: argv.issuer } : {}),
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

export const list = async (argv: TrustArgs) => {
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
    publisher.environment ?? 'any',
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
  const widths = header.map((title, column) =>
    Math.max(title.length, ...rows.map((row) => row[column].length)),
  );
  const line = (cells: string[]) =>
    `  ${cells.map((cell, column) => cell.padEnd(widths[column])).join('  ')}`.trimEnd();

  console.log(`\n${chalk.bold(`Workflows trusted to publish into ${argv.scope}`)}\n`);
  console.log(chalk.dim(line(header)));
  rows.forEach((row) => console.log(line(row)));
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
export const remove = async (argv: TrustRemoveArgs) => {
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
