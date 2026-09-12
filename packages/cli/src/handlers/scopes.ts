/* eslint-disable no-console */
import chalk from 'chalk';
import { GlobalArgs } from '../util/args';
import { RegistryClient, ScopeSummary } from '../util/registry';

type ScopeArgs = GlobalArgs & { name: string };

/**
 * A scope is a namespace someone owns, and it is half of every package address. Publishing
 * provisions the caller's own; every other name has to be claimed, which is what stops a
 * publish into `@react` or `@stripe` from succeeding merely because nobody had taken it.
 *
 * The registry has refused unclaimed scopes since it learned to read the one a package
 * declares, and it names this command when it does. Until now that instruction pointed at
 * nothing — the only way out of the refusal was an http request written by hand.
 */
export const create = async (argv: ScopeArgs) => {
  const client = new RegistryClient(argv.registry);
  const { scope, created } = await client.createScope(argv.name);

  console.log(
    created ? chalk.green(`Claimed ${scope.id}`) : chalk.dim(`${scope.id} is already yours`),
  );
};

const ownerOf = (scope: ScopeSummary) =>
  scope.owner.kind === 'org' ? `org ${scope.owner.id}` : scope.owner.id;

export const list = async (argv: GlobalArgs) => {
  const client = new RegistryClient(argv.registry);
  const scopes = await client.listScopes();

  if (!scopes.length) {
    console.log(chalk.dim('You own no scopes yet. Publishing provisions your own.'));

    return;
  }

  const width = Math.max(...scopes.map((s) => s.id.length));

  console.log(`\n${chalk.bold('Scopes you own')}\n`);
  scopes.forEach((scope) => {
    console.log(
      `  ${scope.id.padEnd(width)}  ${chalk.dim(`since ${scope.createdAt.slice(0, 10)}`)}`,
    );
  });
  console.log();
};

/**
 * Whether a name is taken, and by whom. Public on the registry, because a scope's
 * existence is already public — it is embedded in the address of every package under it.
 */
export const get = async (argv: ScopeArgs) => {
  const client = new RegistryClient(argv.registry);

  try {
    const scope = await client.getScope(argv.name);

    console.log(`${chalk.bold(scope.id)}  ${chalk.dim(`owned by ${ownerOf(scope)}`)}`);
  } catch (error) {
    // A 404 is the answer, not a failure: it is what `is this name free` looks like.
    if (/404/.test((error as Error).message)) {
      console.log(chalk.dim(`${argv.name} is unclaimed.`));

      return;
    }

    throw error;
  }
};
