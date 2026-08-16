/* eslint-disable no-console */
import chalk from 'chalk';
import { parseEnvironment, RegistryClient } from '../../util/registry';

export type EnvArgs = {
  registry: string;
  scopeId: string;
  environment?: string;
};

const target = (argv: EnvArgs & { name?: string }) => {
  const environment = argv.name ?? argv.environment;
  if (!environment) {
    throw new Error(
      "No environment given. Pass --environment or set one with 'appshell config set environment <name>'.",
    );
  }

  return parseEnvironment(environment, argv.scopeId);
};

export const list = async (argv: EnvArgs & { owner?: string }) => {
  const environments = await new RegistryClient(argv.registry).listEnvironments(
    argv.scopeId,
    argv.owner,
  );

  if (!environments.length) {
    console.log('No environments found.');
    return;
  }

  console.table(
    environments.map((env) => ({
      name: `${env.scopeId}/${env.name}`,
      revision: env.revision,
      apps: Object.keys(env.apps ?? {}).length,
      visibility: env.visibility,
      ephemeral: env.ephemeral,
      owner: env.owner,
    })),
  );
};

export const get = async (argv: EnvArgs & { name?: string }) => {
  const { scopeId, name } = target(argv);
  const environment = await new RegistryClient(argv.registry).getEnvironment(scopeId, name);

  console.log(JSON.stringify(environment, null, 2));
};

export const create = async (
  argv: EnvArgs & { name: string; ephemeral: boolean; visibility?: 'public' | 'private' },
) => {
  const { id } = await new RegistryClient(argv.registry).createEnvironment({
    name: argv.name,
    ephemeral: argv.ephemeral,
    visibility: argv.visibility,
  });

  console.log(chalk.green(`Created environment ${id}`));
};

export const remove = async (argv: EnvArgs & { name: string }) => {
  const { scopeId, name } = target(argv);
  await new RegistryClient(argv.registry).deleteEnvironment(scopeId, name);

  console.log(chalk.green(`Deleted environment ${scopeId}/${name}`));
};

export const deactivate = async (argv: EnvArgs & { app: string }) => {
  const { scopeId, name } = target(argv);
  const { scopeId: appScopeId, name: appName } = parseEnvironment(argv.app, argv.scopeId);
  await new RegistryClient(argv.registry).deactivate(scopeId, name, appScopeId, appName);

  console.log(chalk.green(`Deactivated ${appScopeId}/${appName} in ${scopeId}/${name}`));
};

export const revisions = async (argv: EnvArgs & { name?: string; limit?: number }) => {
  const { scopeId, name } = target(argv);
  const history = await new RegistryClient(argv.registry).revisions(scopeId, name, argv.limit);

  if (!history.length) {
    console.log('No revisions found.');
    return;
  }

  console.table(
    history.map((revision) => ({
      revision: revision.revision,
      actor: revision.actor,
      reason: revision.reason,
      createdAt: revision.createdAt,
    })),
  );
};

export const rollback = async (argv: EnvArgs & { name?: string; to: number }) => {
  const { scopeId, name } = target(argv);
  await new RegistryClient(argv.registry).rollback(scopeId, name, argv.to);

  console.log(chalk.green(`Rolled ${scopeId}/${name} back to revision ${argv.to}`));
};

export const composition = async (argv: EnvArgs & { name?: string }) => {
  const { scopeId, name } = target(argv);
  const resolved = await new RegistryClient(argv.registry).composition(scopeId, name);

  console.log(JSON.stringify(resolved, null, 2));
};

export const open = async (argv: EnvArgs & { name?: string }) => {
  const { scopeId, name } = target(argv);

  console.log(`${argv.registry.replace(/\/$/, '')}/e/${scopeId}/${name}`);
};

export const sync = async (
  argv: EnvArgs & {
    from: string;
    to?: string;
    mode?: 'replace' | 'merge';
    include?: Array<
      | 'apps'
      | 'shell'
      | 'overrides'
      | 'allowOverrides'
      | 'sharedBaselines'
      | 'sharedDepsEnforcement'
      | 'visibility'
    >;
  },
) => {
  const source = parseEnvironment(argv.from, argv.scopeId);
  const destinationName = argv.to ?? argv.environment;
  if (!destinationName) {
    throw new Error(
      "No target environment given. Pass --to or set one with 'appshell config set environment <name>'.",
    );
  }
  const destination = parseEnvironment(destinationName, argv.scopeId);

  await new RegistryClient(argv.registry).syncEnvironment(destination.scopeId, destination.name, {
    fromScopeId: source.scopeId,
    fromName: source.name,
    mode: argv.mode,
    include: argv.include,
  });

  console.log(
    chalk.green(
      `Synced ${destination.scopeId}/${destination.name} from ${source.scopeId}/${source.name}`,
    ),
  );
};
