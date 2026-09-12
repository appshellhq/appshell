/* eslint-disable no-console */
import chalk from 'chalk';
import { GlobalArgs } from '../util/args';
import { ApplicationSummary, PackageSummary, RegistryClient } from '../util/registry';

type PackagesArgs = GlobalArgs & { scope?: string };
type PackageArgs = PackagesArgs & { name: string };

/**
 * Which applications activate a given `scope/name@version`.
 *
 * The listing is worth little without this. It is the one fact needed before unpublishing
 * anything, and it lived in a different endpoint that a developer had to know to join by
 * hand — which is how the wrong version came to be named for removal.
 *
 * Taken from the applications listing, which carries each application's activated set
 * inline, so this is one request rather than one per application.
 */
const activations = (applications: ApplicationSummary[]): Map<string, string[]> => {
  const byPackageId = new Map<string, string[]>();

  applications.forEach((application) => {
    Object.values(application.packages ?? {}).forEach(({ packageId }) => {
      const held = byPackageId.get(packageId) ?? [];

      byPackageId.set(packageId, [...held, `${application.scopeId}/${application.name}`]);
    });
  });

  return byPackageId;
};

const idOf = (pkg: PackageSummary) => `${pkg.scopeId}/${pkg.name}@${pkg.version}`;

/** Newest first, by publish time, so the version most likely wanted reads first. */
const newestFirst = (a: PackageSummary, b: PackageSummary) =>
  Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

const versionLine = (pkg: PackageSummary, held: Map<string, string[]>, width: number) => {
  const where = held.get(idOf(pkg));
  const mark = where?.length
    ? chalk.green(`activated in ${where.join(', ')}`)
    : chalk.dim('not activated');

  return `  ${pkg.version.padEnd(width)}  ${chalk.dim(pkg.visibility.padEnd(7))}  ${mark}`;
};

export const list = async (argv: PackagesArgs) => {
  const client = new RegistryClient(argv.registry);
  const scopeId = argv.scope ?? argv.scopeId;
  const [packages, applications] = await Promise.all([
    client.listPackages(scopeId),
    client.listApplications(scopeId),
  ]);

  if (!packages.length) {
    console.log(`\nNo packages published in ${scopeId}.`);

    return;
  }

  const held = activations(applications);
  const byName = new Map<string, PackageSummary[]>();

  packages.forEach((pkg) => byName.set(pkg.name, [...(byName.get(pkg.name) ?? []), pkg]));

  console.log(chalk.bold(`\nPackages in ${scopeId}\n`));

  [...byName.keys()].sort().forEach((name) => {
    const versions = (byName.get(name) ?? []).sort(newestFirst);
    const width = Math.max(...versions.map(({ version }) => version.length));

    console.log(`  ${chalk.cyan(name)}`);
    versions.forEach((pkg) => console.log(versionLine(pkg, held, width)));
    console.log('');
  });
};

export const get = async (argv: PackageArgs) => {
  const client = new RegistryClient(argv.registry);
  const [scopeId, name] = argv.name.includes('/')
    ? argv.name.split('/')
    : [argv.scope ?? argv.scopeId, argv.name];

  const [versions, applications] = await Promise.all([
    client.packageVersions(scopeId, name),
    client.listApplications(scopeId),
  ]);

  if (!versions.length) {
    console.log(`\nNo versions of ${scopeId}/${name} are published.`);

    return;
  }

  const held = activations(applications);
  const ordered = [...versions].sort(newestFirst);
  const width = Math.max(...ordered.map(({ version }) => version.length));

  console.log(chalk.bold(`\n${scopeId}/${name}\n`));
  ordered.forEach((pkg) => console.log(versionLine(pkg, held, width)));
  console.log('');
};

export const describe = async (argv: PackageArgs) => {
  const client = new RegistryClient(argv.registry);
  const [reference, version] = argv.name.split('@');
  const [scopeId, name] = reference.includes('/')
    ? reference.split('/')
    : [argv.scope ?? argv.scopeId, reference];

  const [pkg, applications] = await Promise.all([
    client.getPackage(scopeId, name, version),
    client.listApplications(scopeId),
  ]);

  const where = activations(applications).get(idOf(pkg)) ?? [];

  console.log(chalk.bold(`\n${scopeId}/${name}@${pkg.version}\n`));
  console.log(`  ${chalk.dim('visibility')}  ${pkg.visibility}`);
  console.log(`  ${chalk.dim('published')}   ${new Date(pkg.publishedAt).toLocaleString()}`);
  console.log(`  ${chalk.dim('owner')}       ${pkg.owner}`);
  // Named rather than counted: it is what decides whether this version can be removed.
  console.log(
    `  ${chalk.dim('activated')}   ${where.length ? where.join(', ') : chalk.dim('nowhere')}`,
  );
  // The surface, which is what a version *is* — and the fastest way to answer whether it
  // changed, without diffing two manifests by eye.
  console.log(`  ${chalk.dim('digest')}      ${pkg.digest}`);

  const components = Object.keys(pkg.manifest?.components ?? {});

  if (components.length) {
    console.log(`\n  ${chalk.bold('components')}`);
    components.forEach((key) => {
      const component = key.split('/').slice(1).join('/');

      console.log(`    ${scopeId}/${name}/${component}  ${chalk.dim(key)}`);
    });
  }

  const consumes = pkg.manifest?.remotes ?? [];

  if (consumes.length) {
    console.log(`\n  ${chalk.bold('consumes')}  ${consumes.join(', ')}`);
  }

  const shared = pkg.manifest?.shared?.scopes ?? {};

  Object.entries(shared).forEach(([shareScope, deps]) => {
    console.log(`\n  ${chalk.bold(`shared (${shareScope})`)}`);
    Object.entries(deps).forEach(([dependency, config]) => {
      const range =
        typeof config === 'string'
          ? config
          : (config as { requiredVersion?: string })?.requiredVersion;

      console.log(`    ${dependency}  ${chalk.dim(range ?? 'any')}`);
    });
  });

  console.log('');
};
