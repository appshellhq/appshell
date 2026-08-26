/* eslint-disable no-console */
import { configmap, utils } from '@appshell/config';
import chalk from 'chalk';
import fs from 'fs';
import { ApplicationResource, parseApplication, RegistryClient } from '../../util/registry';

export type AppArgs = {
  registry: string;
  scopeId: string;
  application?: string;
};

const target = (argv: AppArgs & { name?: string }) => {
  const application = argv.name ?? argv.application;
  if (!application) {
    throw new Error(
      "No application given. Pass --application or set one with 'appshell config set application <name>'.",
    );
  }

  return parseApplication(application, argv.scopeId);
};


/**
 * Reads a declared application resource. `${VAR}` placeholders are expanded from
 * `process.env` exactly as `appshell.config.yaml` expands them, so one file can
 * describe several registries without templating it twice.
 */
const readResource = (file: string): ApplicationResource => {
  if (!fs.existsSync(file)) {
    throw new Error(`Resource file not found. ${file}`);
  }

  const resource = utils.load<ApplicationResource>(file);

  if (!resource || typeof resource !== 'object') {
    throw new Error(`${file} is empty or is not a mapping.`);
  }

  // Checked here as well as server side so a typo costs no round trip, and so the
  // message names the file the developer actually edited.
  if (resource.kind !== 'Application') {
    throw new Error(`${file}: kind must be 'Application', got '${resource.kind ?? 'undefined'}'.`);
  }

  if (!resource.apiVersion) {
    throw new Error(`${file}: apiVersion is required.`);
  }

  if (!resource.name) {
    throw new Error(`${file}: name is required.`);
  }

  return configmap.apply(resource, configmap.create(resource as never));
};

export const list = async (argv: AppArgs & { owner?: string }) => {
  const applications = await new RegistryClient(argv.registry).listApplications(
    argv.scopeId,
    argv.owner,
  );

  if (!applications.length) {
    console.log('No applications found.');
    return;
  }

  console.table(
    applications.map((env) => ({
      name: `${env.scopeId}/${env.name}`,
      revision: env.revision,
      packages: Object.keys(env.packages ?? {}).length,
      visibility: env.visibility,
      ephemeral: env.ephemeral,
      owner: env.owner,
    })),
  );
};

export const get = async (argv: AppArgs & { name?: string }) => {
  const { scopeId, name } = target(argv);
  const application = await new RegistryClient(argv.registry).getApplication(scopeId, name);

  console.log(JSON.stringify(application, null, 2));
};

export const create = async (
  argv: AppArgs & {
    name: string;
    ephemeral: boolean;
    visibility?: 'public' | 'private';
    shellBundleUrl?: string;
  },
) => {
  const { id } = await new RegistryClient(argv.registry).createApplication({
    name: argv.name,
    ephemeral: argv.ephemeral,
    visibility: argv.visibility,
    shell: argv.shellBundleUrl ? { shellBundleUrl: argv.shellBundleUrl } : undefined,
  });

  console.log(chalk.green(`Created application ${id}`));
};

export const remove = async (argv: AppArgs & { name: string }) => {
  const { scopeId, name } = target(argv);
  await new RegistryClient(argv.registry).deleteApplication(scopeId, name);

  console.log(chalk.green(`Deleted application ${scopeId}/${name}`));
};

export const deactivate = async (argv: AppArgs & { package: string }) => {
  const { scopeId, name } = target(argv);
  const { scopeId: pkgScopeId, name: pkgName } = parseApplication(argv.package, argv.scopeId);
  await new RegistryClient(argv.registry).deactivate(scopeId, name, pkgScopeId, pkgName);

  console.log(chalk.green(`Deactivated ${pkgScopeId}/${pkgName} in ${scopeId}/${name}`));
};

export const revisions = async (argv: AppArgs & { name?: string; limit?: number }) => {
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

export const rollback = async (argv: AppArgs & { name?: string; to: number }) => {
  const { scopeId, name } = target(argv);
  await new RegistryClient(argv.registry).rollback(scopeId, name, argv.to);

  console.log(chalk.green(`Rolled ${scopeId}/${name} back to revision ${argv.to}`));
};

export const composition = async (argv: AppArgs & { name?: string }) => {
  const { scopeId, name } = target(argv);
  const resolved = await new RegistryClient(argv.registry).composition(scopeId, name);

  console.log(JSON.stringify(resolved, null, 2));
};

export const open = async (argv: AppArgs & { name?: string }) => {
  const { scopeId, name } = target(argv);

  console.log(`${argv.registry.replace(/\/$/, '')}/a/${scopeId}/${name}`);
};

export const sync = async (
  argv: AppArgs & {
    from: string;
    to?: string;
    mode?: 'replace' | 'merge';
    include?: Array<
      | 'packages'
      | 'shell'
      | 'overrides'
      | 'allowOverrides'
      | 'sharedBaselines'
      | 'sharedDepsEnforcement'
      | 'visibility'
    >;
  },
) => {
  const source = parseApplication(argv.from, argv.scopeId);
  const destinationName = argv.to ?? argv.application;
  if (!destinationName) {
    throw new Error(
      "No target application given. Pass --to or set one with 'appshell config set application <name>'.",
    );
  }
  const destination = parseApplication(destinationName, argv.scopeId);

  await new RegistryClient(argv.registry).syncApplication(destination.scopeId, destination.name, {
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

export const clone = async (
  argv: AppArgs & {
    from: string;
    to?: string;
    visibility?: 'public' | 'private';
    ephemeral?: boolean;
  },
) => {
  const source = parseApplication(argv.from, argv.scopeId);
  const destinationName = argv.to ?? argv.application;
  if (!destinationName) {
    throw new Error(
      "No target application given. Pass --to or set one with 'appshell config set application <name>'.",
    );
  }
  const destination = parseApplication(destinationName, argv.scopeId);

  await new RegistryClient(argv.registry).cloneApplication(destination.scopeId, destination.name, {
    fromScopeId: source.scopeId,
    fromName: source.name,
    visibility: argv.visibility,
    ephemeral: argv.ephemeral,
  });

  console.log(
    chalk.green(
      `Cloned ${destination.scopeId}/${destination.name} from ${source.scopeId}/${source.name}`,
    ),
  );
};

export const apply = async (argv: AppArgs & { file: string }) => {
  const resource = readResource(argv.file);
  const result = await new RegistryClient(argv.registry).apply(resource);

  console.log(chalk.green(`${result.created ? 'Created' : 'Updated'} ${result.id}`));

  // Reconciliation is the point of the command, so say what actually moved rather
  // than only that it succeeded.
  if (result.changes?.length) {
    result.changes.forEach((change) => console.log(chalk.dim(`  ${change}`)));
  } else if (resource.spec?.packages) {
    console.log(chalk.dim('  packages already match'));
  }
};
