/* eslint-disable no-console */
import { configmap, utils } from '@appshell/config';
import chalk from 'chalk';
import fs from 'fs';
import {
  ApplicationResource,
  parseApplication,
  parsePackage,
  RegistryClient,
} from '../../util/registry';

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
    shellBundleUrl?: string;
  },
) => {
  const { id } = await new RegistryClient(argv.registry).createApplication({
    name: argv.name,
    ephemeral: argv.ephemeral,
    shell: argv.shellBundleUrl ? { shellBundleUrl: argv.shellBundleUrl } : undefined,
  });

  console.log(chalk.green(`Created application ${id}`));
};

export const remove = async (argv: AppArgs & { name: string }) => {
  const { scopeId, name } = target(argv);
  await new RegistryClient(argv.registry).deleteApplication(scopeId, name);

  console.log(chalk.green(`Deleted application ${scopeId}/${name}`));
};

/**
 * Reads `--set NAME=value`, resolving each name to the federation scope that reads it.
 *
 * The scope is looked up in the package being activated rather than typed, because the
 * package already says which names it declares and under which scope — asking the author
 * to repeat it is a second place to be wrong. A name the package does not declare is a
 * typo, and saying so before the request beats supplying configuration nothing reads.
 *
 * `Scope.NAME=value` is accepted for the case a package declares one name under more than
 * one scope, which nothing does today but the syntax cannot rule out.
 */
export const settings = (
  pairs: string[] | undefined,
  declared: Record<string, Record<string, unknown>>,
): Record<string, Record<string, string>> | undefined => {
  if (!pairs?.length) return undefined;

  return pairs.reduce<Record<string, Record<string, string>>>((acc, pair) => {
    const at = pair.indexOf('=');

    if (at < 1) {
      throw new Error(`'${pair}' is not a setting. Use NAME=value.`);
    }

    const key = pair.slice(0, at);
    const value = pair.slice(at + 1);
    const [qualifier, unqualified] = key.includes('.') ? key.split('.') : [undefined, key];
    const scopes = Object.entries(declared)
      .filter(([scope, vars]) => (qualifier ? scope === qualifier : unqualified in vars))
      .map(([scope]) => scope);

    if (!scopes.length) {
      throw new Error(
        `Nothing declares ${key}. This package declares: ${
          Object.entries(declared)
            .flatMap(([scope, vars]) => Object.keys(vars).map((n) => `${scope}.${n}`))
            .join(', ') || 'no vars'
        }.`,
      );
    }

    if (scopes.length > 1) {
      throw new Error(
        `${unqualified} is declared under more than one scope: ${scopes.join(
          ', ',
        )}. Qualify it, such as ${scopes[0]}.${unqualified}=...`,
      );
    }

    return { ...acc, [scopes[0]]: { ...acc[scopes[0]], [unqualified]: value } };
  }, {});
};

/**
 * Activates a package, supplying the configuration it declares in the same request.
 *
 * Activation is the binding moment: it is where the set of packages changes and where a
 * deploy job has the environment to hand. The registry merges the values into the
 * application's `overrides.vars` and then checks the packages against them, so supplying
 * and validating see the same state rather than racing.
 */
export const activate = async (argv: AppArgs & { package: string; set?: string[] }) => {
  const { scopeId, name } = target(argv);
  const { scopeId: pkgScopeId, name: pkgName, version } = parsePackage(argv.package, argv.scopeId);
  const client = new RegistryClient(argv.registry);
  // Only fetched when there is something to resolve against.
  const declared = argv.set?.length
    ? (await client.packageManifest(pkgScopeId, pkgName)).vars ?? {}
    : {};

  const packageId = `${pkgScopeId}/${pkgName}@${version}`;

  await client.activate(scopeId, name, packageId, settings(argv.set, declared));

  // The response carries the application id, not the package's — naming what was activated
  // is the useful half, and echoing the application twice reads as a bug.
  console.log(chalk.green(`Activated ${packageId} in ${scopeId}/${name}`));

  const report = await client.varsReport(scopeId, name);
  const missing = report.requirements.filter(({ supplied }) => !supplied);

  if (missing.length) {
    console.log(
      chalk.yellow(
        `  still unsupplied: ${missing.map(({ scope, name: n }) => `${scope}.${n}`).join(', ')}`,
      ),
    );
  }
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
