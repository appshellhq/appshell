/* eslint-disable no-console */
import { outdated } from '@appshell/config';
import chalk from 'chalk';
import CliTable3 from 'cli-table3';
import { first, uniq } from 'lodash';
import { ComparisonResult, ComparisonResults } from 'packages/config/src/types';
import { groupByPackageName } from '../../../config/src/sync';
import { fetchPackageSpec, fetchSharedModules } from '../util/fetch';

export type OutdatedArgs = {
  apiKey: string | undefined;
  apiKeyHeader: string | undefined;
  registry: string;
  environment: string | undefined;
  scopeId: string;
  workingDir: string;
  manager: string;
};

const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural;

const createHeading = (moduleName: string, results: ComparisonResult[]) => {
  const conflicts = results.filter((r) => r.status === 'conflict');
  return chalk.bold.yellow(
    `Found ${conflicts.length} shared ${pluralize(
      conflicts.length,
      'dependency',
      'dependencies',
    )} out of sync with ${moduleName}`,
  );
};

const color = (status: string) => {
  switch (status) {
    case 'conflict':
      return chalk.red;
    case 'missing':
      return chalk.yellow;
    case 'satisfied':
      return chalk.green;
    default:
      return chalk.white;
  }
};

const badge = (status: string) => {
  switch (status) {
    case 'conflict':
      return '\u2717';
    case 'missing':
      return '\u26A0';
    case 'satisfied':
      return '\u2714';
    default:
      return chalk.white;
  }
};

const createModuleTable = (results: ComparisonResult[]) => {
  const sample = first(results)?.sampleModule;
  const baseline = first(results)?.baselineModule;
  const table = new CliTable3({
    head: ['', chalk.white('Package'), chalk.white(sample), chalk.white(baseline)],
  });

  results.forEach((result) => {
    const colorFn = color(result.status);
    table.push([
      colorFn(badge(result.status)),
      colorFn(result.packageName),
      colorFn(result.sampleVersion),
      colorFn(result.baselineVersion),
    ]);
  });

  return table;
};

const printModuleResults = (results: ComparisonResults) => {
  const conflicts = groupByPackageName(results.conflicts);
  const missing = groupByPackageName(results.missing);
  const satisfied = groupByPackageName(results.satisfied);
  const flatResults = satisfied.concat(missing).concat(conflicts).flat();

  // Group the results by baselineModule
  const groupedResults = flatResults.reduce((groups, result) => {
    const key = result.baselineModule;
    if (!groups[key]) {
      // eslint-disable-next-line no-param-reassign
      groups[key] = [];
    }
    groups[key].push(result);

    return groups;
  }, {} as Record<string, ComparisonResult[]>);

  // Display the results in a table
  Object.entries(groupedResults).forEach(([baselineModule, value]) => {
    const table = createModuleTable(value);

    console.group(createHeading(baselineModule, value));
    console.log(table.toString());
    console.groupEnd();
  });
};

const createSummaryTable = (results: ComparisonResult[]) => {
  const table = new CliTable3({
    head: [
      '',
      chalk.white('Package'),
      chalk.white('Source Module'),
      chalk.white('Source Version'),
      chalk.white('Baseline Module'),
      chalk.white('Baseline Version'),
      chalk.white('Recommended Version'),
    ],
  });

  results.forEach((result) => {
    const colorFn = color(result.status);
    table.push([
      colorFn(badge(result.status)),
      colorFn(result.packageName),
      colorFn(result.sampleModule),
      colorFn(result.sampleVersion),
      colorFn(result.baselineModule),
      colorFn(result.baselineVersion),
      `${result.packageName}@${result.baselineVersion}`,
    ]);
  });

  return table;
};

const printSummary = (results: ComparisonResults[]) => {
  const conflicts = results
    .flatMap((res) => Object.values(res.conflicts))
    .sort((a, b) => {
      if (a.packageName < b.packageName) {
        return -1;
      }
      if (a.packageName > b.packageName) {
        return 1;
      }
      return 0;
    });
  const packageCount = uniq(conflicts.map((c) => c.packageName)).length;
  const moduleCount = uniq(conflicts.map((c) => c.baselineModule)).length;

  console.log(
    chalk.bold.red(
      `\nSummary: ${packageCount} ${pluralize(
        packageCount,
        'package',
        'packages',
      )} out of sync across ${moduleCount} ${pluralize(moduleCount, 'module', 'modules')}`,
    ),
  );
  const table = createSummaryTable(conflicts);
  console.log(table.toString());
};

export default async (argv: OutdatedArgs) => {
  const { apiKey, apiKeyHeader, workingDir, registry, environment, scopeId, manager } = argv;

  try {
    console.log(`outdated --working-dir=${workingDir} --registry=${registry} --manager=${manager}`);

    const packageSpec = await fetchPackageSpec(workingDir, apiKey, apiKeyHeader);
    const modules = await fetchSharedModules(registry, environment, scopeId, apiKey, apiKeyHeader);

    console.debug('Shared modules:', JSON.stringify(modules, null, 2));
    const jobs = Object.entries(modules).map(async ([name, shared]) => {
      const results = await outdated(packageSpec, { name, shared });

      printModuleResults(results);

      return results;
    });

    const results = await Promise.all(jobs);

    printSummary(results);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Error analyzing outdated shared dependencies', err.message);
  }
};
