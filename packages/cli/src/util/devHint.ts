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
 * What the probe found at the hinted origin.
 *
 * Three outcomes, not two, because the middle one is the whole point: *unconfirmed* is not
 * *disproved*. Nothing answering at a port is what a dev server that has not been started
 * yet looks like, and opening an overlay before starting the server is a normal order of
 * operations. Only a manifest that names somebody else's remotes actually disproves the
 * hint, and that is the one case worth refusing over.
 */
export type DevHintCheck =
  | { verdict: 'serving' }
  | { verdict: 'displaced'; serving: string[] }
  | { verdict: 'unconfirmed'; reason: string };

/**
 * Asks whether the origin is serving *this* package, not merely serving something.
 *
 * Nothing deletes the hint when a dev server stops, so it can name a port that another
 * process has since taken. Checking only that the port answers would then redirect a
 * package at whatever now lives there. Matching the remote keys the overlay is about to
 * redirect makes the check answer the question that matters — and lets it distinguish
 * "that port belongs to someone else" from "I could not tell", which are owed different
 * answers.
 *
 * The reason is carried out rather than logged here, because what to do about it belongs
 * to the caller: this decides what is true, not what happens next.
 */
export const verifyDevHint = async (hint: DevHint, remoteKeys: string[]): Promise<DevHintCheck> => {
  if (!remoteKeys.length) {
    return { verdict: 'unconfirmed', reason: 'there are no remotes to check for' };
  }

  let response: Response;

  try {
    response = await fetch(`${hint.origin}/appshell.manifest.json`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch {
    return { verdict: 'unconfirmed', reason: `nothing answered at ${hint.origin}` };
  }

  if (!response.ok) {
    return {
      verdict: 'unconfirmed',
      reason: `${hint.origin} answered ${response.status} for its manifest`,
    };
  }

  let served: string[];

  try {
    const manifest = (await response.json()) as { remotes?: Record<string, unknown> };
    served = Object.keys(manifest?.remotes ?? {});
  } catch {
    return { verdict: 'unconfirmed', reason: `${hint.origin} did not answer with a manifest` };
  }

  const found = remoteKeys.filter((key) => served.includes(key));

  if (found.length === remoteKeys.length) return { verdict: 'serving' };

  // Serving some of them is the same dev server running an older build: the origin is
  // right, so this is worth saying out loud and not worth refusing over.
  if (found.length) {
    const absent = remoteKeys.filter((key) => !found.includes(key));

    return { verdict: 'unconfirmed', reason: `${hint.origin} is not serving ${absent.join(', ')}` };
  }

  // Serving other remotes and none of ours is a port that now belongs to another package.
  // Serving none at all is as likely to be a half-started dev server, so it is not.
  return served.length
    ? { verdict: 'displaced', serving: served }
    : { verdict: 'unconfirmed', reason: `${hint.origin} is serving no remotes` };
};

export default readDevHint;
