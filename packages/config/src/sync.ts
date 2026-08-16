/* eslint-disable no-console */
import chalk from 'chalk';
import { spawn } from 'child_process';
import { groupBy, uniq } from 'lodash';
import semver from 'semver';
import { ComparisonResult } from './types';

export type ResolutionStrategy = 'highest' | 'lowest';
export type PackageManager = 'npm' | 'yarn';

export const logPackageConflicts = (conflicts: ComparisonResult[]) => {
  if (!conflicts.length) {
    return;
  }

  const { packageName } = conflicts[0];
  console.log(
    chalk.bold.yellow(
      `Resolving ${conflicts.length} conflict${
        conflicts.length > 1 ? 's' : ''
      } against the same package ${packageName} from modules ${uniq(
        conflicts.flat().map((conflict) => conflict.baselineModule),
      ).join(', ')}`,
    ),
  );

  conflicts.forEach((conflict) => {
    console.log(
      chalk.cyan(
        `\u25CB Module ${conflict.sampleModule} \u2192 ${conflict.packageName}@${conflict.sampleVersion} VS Module ${conflict.baselineModule} \u2192 ${conflict.packageName}@${conflict.baselineVersion}`,
      ),
    );
  });
};

export const syncDependencies = async (
  workingDir: string,
  registry: string,
  packages: string[],
  packageManager: 'npm' | 'yarn',
) => {
  console.log(chalk.blue(`Syncing shared dependencies`));
  console.debug(JSON.stringify(packages, null, 2));

  const action = packageManager === 'npm' ? 'install' : 'add';

  const args = [action, ...packages, '--force'];

  await new Promise((resolve, reject) => {
    console.log(`${packageManager} ${args.join(' ')}`);
    // On Windows npm/yarn are .cmd shims, which spawn cannot execute directly.
    const child = spawn(packageManager, args, {
      stdio: 'inherit',
      cwd: workingDir,
      shell: process.platform === 'win32',
    });

    child.on('error', (err) =>
      reject(new Error(`${packageManager} failed to ${action} dependencies: ${err.message}`)),
    );

    child.on('exit', (code) => {
      console.debug(`${packageManager} process exited with code: ${code}`);
      if (code === 0) {
        console.log(`Successfully synced shared dependencies with ${registry}!`);
        resolve(code);
      } else {
        reject(
          new Error(`${packageManager} failed to ${action} dependencies with exit code: ${code}`),
        );
      }
    });
  });
};

export const resolveConflicts = (
  conflicts: ComparisonResult[][],
  resolutionStrategy: ResolutionStrategy,
) => {
  const comparer = resolutionStrategy === 'highest' ? semver.gt : semver.lt;

  return conflicts
    .map((conflict) => {
      logPackageConflicts(conflict);

      return conflict.reduce((acc, current) => {
        const accVersion = semver.minVersion(acc.baselineVersion);
        const currentVersion = semver.minVersion(current.baselineVersion);

        if (accVersion && currentVersion) {
          return comparer(accVersion, currentVersion) ? acc : current;
        }
        return acc;
      });
    })
    .map((conflict) => `${conflict.packageName}@${conflict.baselineVersion}`);
};

export const groupByPackageName = (conflicts: Record<string, ComparisonResult>) =>
  Object.values(groupBy(Object.values(conflicts), (conflict) => conflict.packageName));

export const groupBySampleModule = (conflicts: Record<string, ComparisonResult>) =>
  Object.values(groupBy(Object.values(conflicts), (conflict) => conflict.sampleModule));

export const groupByBaselineModule = (conflicts: Record<string, ComparisonResult>) =>
  Object.values(groupBy(Object.values(conflicts), (conflict) => conflict.baselineModule));

/**
 * Syncs shared dependencies
 * @param workingDir - working directory
 * @param registry - registry to sync dependencies with
 * @param conflicts - shared dependencies to sync
 * @param resolutionStrategy - resolution strategy to use for syncing dependencies (highest or lowest)
 * @param packageManager - package manager to use for syncing dependencies (npm or yarn)
 * @param dryRun - if true, only logs the shared dependencies to sync
 */
export default async (
  workingDir: string,
  registry: string,
  conflicts: Record<string, ComparisonResult>,
  resolutionStrategy: ResolutionStrategy = 'highest',
  packageManager: PackageManager = 'npm',
  dryRun = false,
) => {
  console.log(
    chalk.blue(
      `Analyzing ${
        Object.keys(conflicts).length
      } shared dependencies with resolution strategy: ${resolutionStrategy}`,
    ),
  );

  const conflictGroups = groupByPackageName(conflicts);
  const outOfSync = resolveConflicts(conflictGroups, resolutionStrategy);

  if (dryRun) {
    console.log(
      chalk.bold.blue(
        `\nFound ${outOfSync.length} shared dependencies out of sync with ${registry}`,
      ),
    );
    console.log(chalk.blue(JSON.stringify(outOfSync, null, 2)));
  } else {
    await syncDependencies(workingDir, registry, outOfSync, packageManager);
  }
};
