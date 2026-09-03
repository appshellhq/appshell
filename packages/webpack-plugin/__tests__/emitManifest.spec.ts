/* eslint-disable no-template-curly-in-string -- ${VAR} is the placeholder syntax under test */
import fs from 'fs';
import os from 'os';
import path from 'path';
import webpack, { container } from 'webpack';
import AppshellPlugin from '../src/AppshellPlugin';

/*
 * A real compilation, because this is a claim about webpack's behaviour rather than the
 * plugin's: that `emitAsset` puts the manifest where a dev server will serve it from
 * memory and a production build will write it to disk. A mock compiler asserts only that
 * the plugin called a method, which is what it did before while serving nothing.
 */
// Left unsubstituted on purpose: the manifest is only correct if the plugin resolves it.
const CONFIG = [
  'remotes:',
  '  TestModule/Foo:',
  '    url: ${APPS_TEST_URL}',
  '    filename: remoteEntry.js',
  'vars:',
  '  SUPPORT_URL: ${SUPPORT_URL}',
  '',
].join('\n');

const project = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-emit-'));
  fs.mkdirSync(path.join(root, 'src'));
  // A token reference with no fallback, so the usage scan has something to find and the
  // emitted manifest can be checked against it.
  fs.writeFileSync(
    path.join(root, 'src', 'Entry1.js'),
    "export default () => 'color: var(--appshell-primary)';\n",
  );
  fs.writeFileSync(path.join(root, 'appshell.config.yaml'), CONFIG);
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: '@acme/test-package', version: '1.0.0' }),
  );

  return root;
};

const compile = (root: string, mode: 'production' | 'development') =>
  new Promise<webpack.Stats>((resolve, reject) => {
    webpack(
      {
        mode,
        context: root,
        entry: path.join(root, 'src', 'Entry1.js'),
        output: { path: path.join(root, 'dist'), publicPath: 'auto' },
        plugins: [
          new container.ModuleFederationPlugin({
            name: 'TestModule',
            filename: 'remoteEntry.js',
            exposes: { './Foo': path.join(root, 'src', 'Entry1.js') },
            // Required of any package declaring vars, and the plugin enforces it: without
            // the store as a singleton there is nothing to deliver them into.
            shared: { '@appshell/runtime': { singleton: true } },
          }),
          new AppshellPlugin({
            config: path.join(root, 'appshell.config.yaml'),
            publish: false,
          }),
        ],
      },
      (error, stats) => (error || !stats ? reject(error) : resolve(stats)),
    );
  });

describe('the emitted manifest', () => {
  let root: string;
  let stats: webpack.Stats;

  beforeAll(async () => {
    root = project();
    process.env.APPS_TEST_URL = 'http://localhost:4001';
    stats = await compile(root, 'production');
  }, 60_000);

  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  const emitted = () => stats.toJson({ assets: true }).assets?.map((asset) => asset.name) ?? [];

  const manifest = () =>
    JSON.parse(fs.readFileSync(path.join(root, 'dist', 'appshell.manifest.json'), 'utf-8'));

  it('should compile without errors', () => {
    expect(stats.compilation.errors).toEqual([]);
  });

  /*
   * The whole point. `manifestUrl` in every published manifest has always been
   * `<url>/appshell.manifest.json`, and until this asset existed that URL resolved
   * nowhere — which is why the CLI's dev-server probe got a 404 every single time.
   */
  it('should be a compilation asset, so a dev server serves it from memory', () => {
    expect(emitted()).toContain('appshell.manifest.json');
  });

  it('should be written to the output directory by a production build', () => {
    expect(fs.existsSync(path.join(root, 'dist', 'appshell.manifest.json'))).toBe(true);
  });

  // What the probe actually asks: are these the remote keys this origin serves?
  it('should name the remotes the package publishes', () => {
    expect(Object.keys(manifest().remotes)).toEqual(['TestModule/Foo']);
  });

  it('should have substituted the template placeholders', () => {
    const json = JSON.stringify(manifest());

    expect(json).not.toContain('${APPS_TEST_URL}');
    expect(json).toContain('http://localhost:4001');
  });

  // It points at itself, so the URL a consumer is handed is the one now being served.
  it('should point manifestUrl at the path it is served from', () => {
    expect(manifest().remotes['TestModule/Foo'].manifestUrl).toBe(
      'http://localhost:4001/appshell.manifest.json',
    );
  });

  /*
   * Token usage is scanned during processAssets, which is also where the manifest is now
   * built. Emitting before the scan would ship a manifest that understated what the
   * package needs, and nothing downstream would have contradicted it.
   */
  it('should carry the token usage scanned from the same compilation', () => {
    expect(manifest().tokens.TestModule.required).toContain('primary');
  });

  it('should still write the template beside it', () => {
    const template = JSON.parse(
      fs.readFileSync(path.join(root, 'dist', 'appshell.template.json'), 'utf-8'),
    );

    expect(template.tokens.TestModule.required).toContain('primary');
  });

  /*
   * A template carries placeholders; that is the whole distinction between it and a
   * manifest. Building the manifest from the same object substituted them in place, so
   * the template on disk carried one environment's values — exactly what publishing from
   * a template is meant to avoid.
   */
  it('should leave the template holding placeholders, not this build environment', () => {
    const template = JSON.parse(
      fs.readFileSync(path.join(root, 'dist', 'appshell.template.json'), 'utf-8'),
    );

    expect(template.vars.TestModule.SUPPORT_URL).toBe('${SUPPORT_URL}');
    expect(template.remotes['TestModule/Foo'].url).toBe('${APPS_TEST_URL}');
  });
});
