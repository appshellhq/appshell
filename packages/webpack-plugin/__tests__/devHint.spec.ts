import fs from 'fs';
import os from 'os';
import path from 'path';
import { DEV_HINT_FILE, devServerOrigin, writeDevHint } from '../src/devHint';

describe('devServerOrigin', () => {
  it('should use the configured host and port', () => {
    expect(devServerOrigin({ host: 'my-box', port: 3002 })).toBe('http://my-box:3002');
  });

  it.each([['0.0.0.0'], ['::'], ['local-ip'], ['local-ipv4'], ['']])(
    'should rewrite %s to what a browser on this machine can actually use',
    (host) => {
      expect(devServerOrigin({ host, port: 3002 })).toBe('http://localhost:3002');
    },
  );

  it('should default the host when none is configured', () => {
    expect(devServerOrigin({ port: 3002 })).toBe('http://localhost:3002');
  });

  it('should accept a port that arrived as a string from the application', () => {
    expect(devServerOrigin({ port: '3002' })).toBe('http://localhost:3002');
  });

  it.each([[{ server: 'https' }], [{ server: { type: 'https' } }], [{ https: true }]])(
    'should reflect https configured as %s',
    (extra) => {
      expect(devServerOrigin({ port: 3002, ...extra })).toBe('https://localhost:3002');
    },
  );

  it.each([['auto'], [0], [undefined], ['not-a-port']])(
    'should refuse to guess when the port is %s',
    (port) => {
      expect(devServerOrigin({ port })).toBeUndefined();
    },
  );

  it('should return nothing when there is no dev server at all', () => {
    expect(devServerOrigin(false)).toBeUndefined();
    expect(devServerOrigin(undefined)).toBeUndefined();
  });
});

describe('writeDevHint', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-hint-'));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const written = () => JSON.parse(fs.readFileSync(path.join(dir, DEV_HINT_FILE), 'utf-8'));

  it('should record where the package is being served and how to reach its entry', () => {
    writeDevHint(dir, { port: 3002 }, 'remoteEntry.js', new Date(0));

    expect(written()).toEqual({
      version: 1,
      origin: 'http://localhost:3002',
      remoteEntryPath: 'remoteEntry.js',
      writtenAt: new Date(0).toISOString(),
    });
  });

  it('should write nothing when the port cannot be resolved', () => {
    expect(writeDevHint(dir, { port: 'auto' }, 'remoteEntry.js')).toBeUndefined();
    expect(fs.existsSync(path.join(dir, DEV_HINT_FILE))).toBe(false);
  });

  it('should delete an earlier hint rather than leave one that would be read as current', () => {
    writeDevHint(dir, { port: 3002 }, 'remoteEntry.js');
    expect(fs.existsSync(path.join(dir, DEV_HINT_FILE))).toBe(true);

    writeDevHint(dir, { port: 'auto' }, 'remoteEntry.js');
    expect(fs.existsSync(path.join(dir, DEV_HINT_FILE))).toBe(false);
  });

  it('should write nothing without a remote entry path to probe', () => {
    expect(writeDevHint(dir, { port: 3002 }, '')).toBeUndefined();
  });
});
