/* eslint-disable no-console */
import { PackageSpec } from '@appshell/config';
import fs from 'fs';
import { SharedObject } from 'packages/config/src/types';
import { parseApplication, RegistryClient, SharedDependencyReport } from './registry';

export const fetchPackageSpec = async (
  workingDir: string,
  _apiKey?: string,
  _apiKeyHeader?: string,
) => {
  const packageSpecPath = `${workingDir}/package.json`;

  if (!fs.existsSync(packageSpecPath)) {
    throw new Error(`Package spec not found at ${packageSpecPath}`);
  }

  return JSON.parse(fs.readFileSync(packageSpecPath, 'utf-8')) as PackageSpec;
};

/**
 * The registry reports every requested range per share scope; the local
 * comparison wants one baseline per package. Prefer the application's declared
 * baseline and otherwise take the first request, which is what the package would
 * actually have to agree with.
 */
const toSharedModules = (report: SharedDependencyReport) =>
  report.dependencies.reduce((acc, usage) => {
    const range = usage.baseline ?? usage.requests.find((r) => r.requiredVersion)?.requiredVersion;
    if (!range) {
      return acc;
    }

    acc[usage.shareScope] = { ...acc[usage.shareScope], [usage.packageName]: range };

    return acc;
  }, {} as Record<string, SharedObject>);

/** Shared dependency baselines come from an application's composition. */
export const fetchSharedModules = async (
  registry: string,
  application: string | undefined,
  scopeId: string,
): Promise<Record<string, SharedObject>> => {
  if (!application) {
    throw new Error(
      "No application given. Pass --application or set one with 'appshell config set application <name>'.",
    );
  }

  const { scopeId: envScope, name } = parseApplication(application, scopeId);
  const report = await new RegistryClient(registry).sharedDeps(envScope, name);

  if (report.conflicts) {
    console.warn(
      `${report.conflicts} shared dependency conflict(s) already exist in ${envScope}/${name}.`,
    );
  }

  return toSharedModules(report);
};
