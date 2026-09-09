import fs from 'fs';
import https from 'https';
import os from 'os';
import path from 'path';
import { readConfig } from './utils/config';

const configPath = () =>
  process.env.APPSHELL_CONFIG || path.join(os.homedir(), '.appshell', 'config');

/**
 * An extra CA bundle to trust, from `ca-file` in the cli config or `APPSHELL_CA_FILE`.
 *
 * A registry behind a private CA — a corporate root, a TLS-inspecting proxy, or a local
 * cluster using mkcert — fails with "unable to verify the first certificate", which says
 * nothing about which host or what to do. Node can be told through `NODE_EXTRA_CA_CERTS`
 * or `--use-system-ca`, but both are environment variables a user has to remember in
 * every new terminal, and neither travels with the registry they apply to.
 *
 * npm draws the same conclusion with `cafile` in .npmrc: trust is configuration of the
 * registry you talk to, not of the shell you happen to be in.
 */
export const caFile = () => process.env.APPSHELL_CA_FILE || readConfig(configPath()).caFile;

/**
 * The agent to use for registry and issuer requests, or undefined when no CA is
 * configured and Node's defaults apply.
 *
 * A configured file that does not exist throws rather than being skipped: falling back
 * silently would reproduce the original certificate error, having been told exactly how
 * to avoid it.
 */
export const httpsAgent = () => {
  const file = caFile();

  if (!file) {
    return undefined;
  }

  if (!fs.existsSync(file)) {
    throw new Error(
      `ca-file does not exist: ${file}. Set it to a PEM bundle, or unset it to use Node's defaults.`,
    );
  }

  return new https.Agent({ ca: fs.readFileSync(file) });
};
