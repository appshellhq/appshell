import fs from 'fs';
import path from 'path';

export const DEV_HINT_FILE = '.appshell-dev.json';

export const DEV_HINT_VERSION = 1;

export type DevHint = {
  version: number;
  /** Where this app's dev server is reachable, as a browser on this machine would ask. */
  origin: string;
  /** From the federation `filename`, so a reader can probe without asking the registry. */
  remoteEntryPath: string;
  /**
   * Diagnostics only. Deliberately not a liveness signal: a server running happily for
   * hours writes an old timestamp, and one that crashed a second ago writes a fresh one.
   * Whether the origin is live is answered by asking the origin.
   */
  writtenAt: string;
};

type DevServerOptions = { [index: string]: unknown } | false | undefined;

/** Hosts a dev server binds to that a browser on the same machine cannot use verbatim. */
const UNUSABLE_HOSTS = new Set(['0.0.0.0', '::', 'local-ip', 'local-ipv4', 'local-ipv6', '']);

const portOf = (devServer: Record<string, unknown>): number | undefined => {
  const {port} = devServer;

  if (typeof port === 'number' && Number.isInteger(port) && port > 0) return port;
  if (typeof port === 'string' && /^\d+$/.test(port)) return Number(port);

  // `auto`, 0, or absent: webpack-dev-server picks the port itself and never writes the
  // result back where a plugin can see it. Guessing here would be worse than staying
  // quiet, because a reader would trust it.
  return undefined;
};

const isHttps = (devServer: Record<string, unknown>): boolean => {
  const server = devServer.server as { type?: string } | string | undefined;

  if (typeof server === 'string') return server === 'https' || server === 'spdy';
  if (server?.type) return server.type === 'https' || server.type === 'spdy';

  return Boolean(devServer.https);
};

export const devServerOrigin = (devServer: DevServerOptions): string | undefined => {
  if (!devServer || typeof devServer !== 'object') return undefined;

  const options = devServer as Record<string, unknown>;
  const port = portOf(options);

  if (!port) return undefined;

  const configured = typeof options.host === 'string' ? options.host : '';
  const host = UNUSABLE_HOSTS.has(configured) ? 'localhost' : configured;

  return `${isHttps(options) ? 'https' : 'http'}://${host}:${port}`;
};

/**
 * Records where this app is being served from while a dev server is running, so tooling
 * can offer it instead of asking a developer to repeat a port they have already
 * configured. Written on every serve build and left to be cleaned with the output
 * directory; nothing removes it when the server stops, which is exactly why a reader
 * must confirm the origin rather than trust the file.
 */
export const writeDevHint = (
  outputDir: string,
  devServer: DevServerOptions,
  remoteEntryPath: string,
  now: Date = new Date(),
): DevHint | undefined => {
  const file = path.resolve(outputDir, DEV_HINT_FILE);
  const origin = devServerOrigin(devServer);

  if (!origin || !remoteEntryPath) {
    // A hint that cannot be trusted is worse than none, and a leftover from an earlier
    // build would be read as current.
    if (fs.existsSync(file)) fs.rmSync(file, { force: true });

    return undefined;
  }

  const hint: DevHint = {
    version: DEV_HINT_VERSION,
    origin,
    remoteEntryPath,
    writtenAt: now.toISOString(),
  };

  fs.writeFileSync(file, JSON.stringify(hint, null, 2));

  return hint;
};

/** webpack-dev-server sets this itself, however webpack was invoked. */
export const isServing = (): boolean => Boolean(process.env.WEBPACK_SERVE);
