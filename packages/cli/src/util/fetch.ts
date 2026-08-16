/* eslint-disable no-console */
import { AppshellManifest, PackageSpec, utils } from '@appshell/config';
import { HttpStatusCode } from 'axios';
import fs from 'fs';
import https from 'https';
import { get } from 'lodash';
import { SharedObject } from 'packages/config/src/types';
import axios from './axios';
import { parseEnvironment, RegistryClient, SharedDependencyReport } from './registry';

export const fetchFromRegistry = async <T>(
  registryPathOrUrl: string,
  apiKey = process.env.APPSHELL_API_KEY || '',
  apiKeyHeader = process.env.APPSHELL_API_KEY_HEADER || 'x-api-key',
) => {
  console.debug(`Fetching snapshot from ${registryPathOrUrl}`);
  const agent = new https.Agent({ rejectUnauthorized: false });
  const res = await axios.get(registryPathOrUrl, {
    httpsAgent: agent,
    headers: {
      [apiKeyHeader]: apiKey,
    },
  });

  console.debug({
    [apiKeyHeader]: apiKey,
  });
  console.debug(`/GET ${res.status} ${res.statusText}`);

  const contentType = String(get(res.headers, 'content-type', ''));
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Failed to fetch from registry ${registryPathOrUrl}. Invalid content type. ${contentType}`,
    );
  }

  if (res.status === HttpStatusCode.Ok) {
    return res.data as T;
  }

  throw new Error(
    `Failed to fetch from registry ${registryPathOrUrl}. ${res.status} ${res.statusText}`,
  );
};

export const fetchSnapshot = async (registry: string, apiKey?: string, apiKeyHeader?: string) => {
  const registryPathOrUrl = `${registry}/appshell.snapshot.json`;

  if (utils.isValidUrl(registryPathOrUrl)) {
    return fetchFromRegistry<AppshellManifest>(registryPathOrUrl, apiKey, apiKeyHeader);
  }

  if (fs.existsSync(registryPathOrUrl)) {
    console.debug(`Reading snapshot from ${registryPathOrUrl}`);
    return JSON.parse(fs.readFileSync(registryPathOrUrl, 'utf-8')) as AppshellManifest;
  }

  throw new Error(`Registry not found. ${registryPathOrUrl}`);
};

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
 * comparison wants one baseline per package. Prefer the environment's declared
 * baseline and otherwise take the first request, which is what the app would
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

/**
 * Shared dependency baselines come from an environment now. The legacy
 * snapshot path stays until the file registry is removed.
 */
export const fetchSharedModules = async (
  registry: string,
  environment: string | undefined,
  scopeId: string,
  apiKey?: string,
  apiKeyHeader?: string,
): Promise<Record<string, SharedObject>> => {
  if (!utils.isValidUrl(registry) || !environment) {
    const snapshot = await fetchSnapshot(registry, apiKey, apiKeyHeader);

    return Object.entries(snapshot.modules).reduce((acc, [name, options]) => {
      acc[name] = options.shared as SharedObject;
      return acc;
    }, {} as Record<string, SharedObject>);
  }

  const { scopeId: envScope, name } = parseEnvironment(environment, scopeId);
  const report = await new RegistryClient(registry).sharedDeps(envScope, name);

  if (report.conflicts) {
    console.warn(
      `${report.conflicts} shared dependency conflict(s) already exist in ${envScope}/${name}.`,
    );
  }

  return toSharedModules(report);
};
