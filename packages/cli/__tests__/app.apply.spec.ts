import fs from 'fs';
import os from 'os';
import path from 'path';
import { apply } from '../src/handlers/app';
import { RegistryClient } from '../src/util/registry';

const RESOURCE = `apiVersion: registry.appshell.org/v1
kind: Application
name: storefront
spec:
  shell:
    root: ContainerModule/Container
    title: \${TEST_APP_TITLE}
  packages:
    - default/checkout@1.5.0
`;

describe('app apply', () => {
  let dir: string;
  let applySpy: jest.SpyInstance;

  const write = (contents: string, name = 'appshell.app.yaml') => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, contents);
    return file;
  };

  const argv = (file: string) => ({ registry: 'http://test.com', scopeId: 'default', file });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-apply-'));
    process.env.TEST_APP_TITLE = 'Storefront';
    applySpy = jest
      .spyOn(RegistryClient.prototype, 'apply')
      .mockResolvedValue({ id: 'default/storefront', created: true, changes: [], message: 'ok' });
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.TEST_APP_TITLE;
    jest.restoreAllMocks();
  });

  it('should send the declared resource to the registry', async () => {
    await apply(argv(write(RESOURCE)));

    expect(applySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        apiVersion: 'registry.appshell.org/v1',
        kind: 'Application',
        name: 'storefront',
      }),
    );
  });

  it('should expand environment placeholders, as appshell.config.yaml does', async () => {
    await apply(argv(write(RESOURCE)));

    const [resource] = applySpy.mock.calls[0];
    expect(resource.spec.shell.title).toBe('Storefront');
  });

  it('should carry the desired package set through untouched', async () => {
    await apply(argv(write(RESOURCE)));

    const [resource] = applySpy.mock.calls[0];
    expect(resource.spec.packages).toEqual(['default/checkout@1.5.0']);
  });

  it('should accept json as readily as yaml', async () => {
    const file = write(
      JSON.stringify({ apiVersion: 'v1', kind: 'Application', name: 'storefront' }),
      'appshell.app.json',
    );

    await apply(argv(file));

    expect(applySpy).toHaveBeenCalled();
  });

  it('should reject a missing file before calling the registry', async () => {
    await expect(apply(argv(path.join(dir, 'absent.yaml')))).rejects.toThrow(
      /Resource file not found/i,
    );
    expect(applySpy).not.toHaveBeenCalled();
  });

  it('should reject the wrong kind, naming what it found', async () => {
    const file = write('apiVersion: v1\nkind: Package\nname: x\n');

    await expect(apply(argv(file))).rejects.toThrow(/kind must be 'Application', got 'Package'/i);
    expect(applySpy).not.toHaveBeenCalled();
  });

  it('should require apiVersion and name', async () => {
    await expect(apply(argv(write('kind: Application\nname: x\n')))).rejects.toThrow(
      /apiVersion is required/i,
    );
    await expect(apply(argv(write('apiVersion: v1\nkind: Application\n')))).rejects.toThrow(
      /name is required/i,
    );
  });
});
