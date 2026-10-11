import fs from 'fs';
import https from 'https';
import os from 'os';
import path from 'path';
import tls from 'tls';
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
/*
 * Node's effective default trust: its bundled roots plus whatever NODE_EXTRA_CA_CERTS or
 * --use-system-ca added. tls.getCACertificates('default') says exactly that (Node 22.15+,
 * 23.10+). tls.rootCertificates, the fallback for older runtimes, is the bundled roots alone,
 * so on those an extra root from the environment is not carried over.
 */
const defaultRoots = (): readonly string[] => {
  const effective = (tls as { getCACertificates?: (type: string) => string[] })
    .getCACertificates;

  return typeof effective === 'function' ? effective('default') : tls.rootCertificates;
};

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

  /*
   * Added to what Node already trusts, not instead of it. `ca` replaces the trust store
   * wholesale, so a bundle configured for a local registry (mkcert, a corporate root) left
   * nothing else trusted: production's public certificate then failed with "unable to get
   * local issuer certificate", and one config could not serve both — which is what
   * `ca-file` exists for.
   */
  return new https.Agent({ ca: [...defaultRoots(), fs.readFileSync(file, 'utf-8')] });
};
