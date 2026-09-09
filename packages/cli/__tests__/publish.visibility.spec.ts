import * as config from '@appshell/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import handler from '../src/handlers/publish';

jest.mock('@appshell/config', () => ({
  ...jest.requireActual('@appshell/config'),
  publish: jest.fn(),
  activate: jest.fn(),
  generateManifest: jest.fn(),
}));

/*
 * Visibility is declared in appshell.config.yaml, carried through the build into
 * appshell.template.json, and never mapped into the manifest — which is hashed into the
 * package digest. That is what lets a package be made public later without changing what
 * it is. Publish reads it off the template; the flag overrides it.
 */
describe('declared visibility', () => {
  let dir: string;
  const original = process.env.APPSHELL_CREDENTIALS;

  const template = (visibility?: string) =>
    fs.writeFileSync(
      path.join(dir, 'template.json'),
      JSON.stringify({ ...(visibility ? { visibility } : {}), remotes: {}, module: {} }),
    );

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-vis-'));
    process.env.APPSHELL_CREDENTIALS = path.join(dir, 'credentials');
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: '@scope/thing', version: '1.2.3' }),
    );
    template();
    jest.spyOn(process, 'cwd').mockReturnValue(dir);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    (config.generateManifest as jest.Mock).mockResolvedValue({ remotes: {} });
    (config.publish as jest.Mock).mockResolvedValue({ id: 'scope/thing@1.2.3', created: true });
  });

  afterEach(() => {
    process.env.APPSHELL_CREDENTIALS = original;
    fs.rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  const publishArgs = (visibility?: 'public' | 'private') =>
    ({
      registry: 'http://localhost:7150',
      scopeId: 'appshell',
      template: path.join(dir, 'template.json'),
      watch: false,
      ...(visibility ? { visibility } : {}),
    } as Parameters<typeof handler>[0]);

  it('publishes with what the yaml declared', async () => {
    template('public');

    await handler(publishArgs());

    expect(config.publish).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'public' }));
  });

  it('lets the flag override the declaration', async () => {
    template('public');

    await handler(publishArgs('private'));

    expect(config.publish).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'private' }));
  });

  // Absent from both, the registry applies its own default rather than the CLI guessing.
  it('sends nothing when neither declares one', async () => {
    template();

    await handler(publishArgs());

    expect(config.publish).toHaveBeenCalledWith(expect.objectContaining({ visibility: undefined }));
  });
});
