/* eslint-disable no-console */
import { outdated, sync } from '@appshell/config';
import { ComparisonResult } from 'packages/config/src/types';
import { PackageManager, ResolutionStrategy } from '../../../config/src/sync';
import { fetchPackageSpec, fetchSharedModules } from '../util/fetch';

export type SyncArgs = {
  apiKey: string | undefined;
  apiKeyHeader: string | undefined;
  registry: string;
  environment: string | undefined;
  scopeId: string;
  workingDir: string;
  packageManager: string;
  resolutionStrategy: string;
  dryRun: boolean;
};

export default async (argv: SyncArgs) => {
  const {
    workingDir,
    registry,
    environment,
    scopeId,
    packageManager,
    resolutionStrategy,
    dryRun,
    apiKey,
    apiKeyHeader,
  } = argv;

  try {
    console.log(
      `sync --working-dir=${workingDir} --registry=${registry} --package-manager=${packageManager} --resolution-strategy=${resolutionStrategy} --dry-run=${dryRun}`,
    );

    const packageSpec = await fetchPackageSpec(workingDir, apiKey, apiKeyHeader);
    const modules = await fetchSharedModules(registry, environment, scopeId, apiKey, apiKeyHeader);

    console.debug('Shared modules:', JSON.stringify(modules, null, 2));
    const jobs = Object.entries(modules).map(([name, shared]) =>
      outdated(packageSpec, { name, shared }),
    );

    const results = await Promise.all(jobs);
    console.debug('Results:', JSON.stringify(results, null, 2));

    const outOfSync = results.reduce(
      (acc, result) =>
        Object.values(result.conflicts).reduce((prev, conflict) => {
          // eslint-disable-next-line no-param-reassign
          prev[`${conflict.packageName}@${conflict.baselineVersion}`] = conflict;

          return prev;
        }, acc),
      {} as Record<string, ComparisonResult>,
    );

    await sync(
      workingDir,
      registry,
      outOfSync,
      resolutionStrategy as ResolutionStrategy,
      packageManager as PackageManager,
      dryRun,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Error analyzing outdated shared dependencies', err.message);
  }
};
