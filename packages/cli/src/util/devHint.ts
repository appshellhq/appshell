/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

const DEV_HINT_FILE = '.appshell-dev.json';
const SUPPORTED_VERSION = 1;
const PROBE_TIMEOUT_MS = 2000;

export type DevHint = {
  version: number;
  origin: string;
  remoteEntryPath: string;
  writtenAt: string;
};

/**
 * Written by `@appshell/webpack-plugin` into the output directory while a dev server is
 * running. Absent whenever the package was not served, or was served on a port the plugin
 * could not resolve — in which case the caller asks for one, which is the behaviour
 * this exists to save, not replace.
 */
export const readDevHint = (cwd: string, outputDir = 'dist'): DevHint | undefined => {
  const file = path.resolve(cwd, outputDir, DEV_HINT_FILE);

  if (!fs.existsSync(file)) return undefined;

  try {
    const hint = JSON.parse(fs.readFileSync(file, 'utf-8')) as DevHint;

    if (hint?.version !== SUPPORTED_VERSION || !hint.origin) return undefined;

    return hint;
  } catch {
    return undefined;
  }
};

/**
 * Confirms the origin is serving *this* package, not merely serving something.
 *
 * Nothing deletes the hint when a dev server stops, so it can name a port that another
 * process has since taken. Checking only that the port answers would then redirect an
 * package at whatever now lives there — a wrong answer arrived at silently, which is the
 * one failure mode this whole path is designed to avoid. Matching the remote keys the
 * overlay is about to redirect makes the check answer the question that matters.
 */
export const verifyDevHint = async (hint: DevHint, remoteKeys: string[]): Promise<boolean> => {
  if (!remoteKeys.length) return false;

  try {
    const response = await fetch(`${hint.origin}/appshell.manifest.json`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });

    if (!response.ok) return false;

    const manifest = (await response.json()) as { remotes?: Record<string, unknown> };
    const served = Object.keys(manifest?.remotes ?? {});

    return remoteKeys.every((key) => served.includes(key));
  } catch {
    return false;
  }
};

export default readDevHint;
