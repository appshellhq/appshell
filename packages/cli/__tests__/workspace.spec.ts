import fs from 'fs';
import os from 'os';
import path from 'path';
import { findWorkspace, findWorkspaceRoot } from '../src/util/workspace';

const write = (file: string, contents: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
};

const pkg = (root: string, dir: string, name: string, version: string, remotes: string[]) => {
  write(path.join(root, dir, 'package.json'), JSON.stringify({ name, version }));
  write(
    path.join(root, dir, 'appshell.config.yaml'),
    `remotes:\n${remotes.map((key) => `  ${key}:\n    url: http://localhost:3000\n`).join('')}`,
  );
};

describe('workspace detection', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-ws-'));
    write(path.join(root, 'package.json'), JSON.stringify({ workspaces: ['packages/*', 'libs/*'] }));

    pkg(root, 'packages/pong', '@example/sample-mfe-pong', '0.0.1', [
      'PongModule/Pong',
      'PongModule/CoolComponent',
    ]);
    pkg(root, 'packages/ping', 'sample-mfe-ping', '0.0.2', ['PingModule/Ping']);

    // A plain library beside the micro-frontends: package.json, no appshell config.
    write(path.join(root, 'libs/components/package.json'), JSON.stringify({ name: 'components' }));
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('should find the root from a nested package directory', () => {
    // `path.resolve`, not `realpath`: workspace roots are compared as written, the
    // way npm and lerna treat them, so a symlinked tmpdir stays as it was handed over.
    expect(findWorkspaceRoot(path.join(root, 'packages/pong'))).toBe(path.resolve(root));
  });

  it('should return nothing outside a workspace', () => {
    expect(findWorkspaceRoot(os.tmpdir())).toBeUndefined();
  });

  it('should list only members that are appshell packages', () => {
    const workspace = findWorkspace(root);

    expect(workspace?.packages.map((a) => a.name)).toEqual(['sample-mfe-ping', 'sample-mfe-pong']);
  });

  it('should report the registry identity, not the scoped package name', () => {
    const pong = findWorkspace(root)?.packages.find((a) => a.name === 'sample-mfe-pong');

    expect(pong).toMatchObject({ name: 'sample-mfe-pong', version: '0.0.1' });
  });

  it('should carry the remote keys that trace an overlay back to a package', () => {
    const pong = findWorkspace(root)?.packages.find((a) => a.name === 'sample-mfe-pong');

    expect(pong?.remotes).toEqual(['PongModule/Pong', 'PongModule/CoolComponent']);
  });

  it('should read members from lerna when package.json declares none', () => {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'root' }));
    fs.writeFileSync(path.join(root, 'lerna.json'), JSON.stringify({ packages: ['packages/*'] }));

    expect(findWorkspace(root)?.packages.map((a) => a.name)).toEqual([
      'sample-mfe-ping',
      'sample-mfe-pong',
    ]);
  });

  it('should skip a package whose config cannot be read rather than failing outright', () => {
    fs.writeFileSync(path.join(root, 'packages/pong/appshell.config.yaml'), 'remotes: [oops\n');

    expect(findWorkspace(root)?.packages.map((a) => a.name)).toEqual(['sample-mfe-ping']);
  });
});
