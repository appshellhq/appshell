import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveTemplate, TEMPLATE_NAME } from '../template';

/*
 * The plugin emits the template into webpack's output directory. `dist` by convention,
 * but the build decides and the cli cannot read a webpack config to find out — so a
 * cwd-relative default made the documented invocation fail for every project that builds
 * into a directory, naming a file that was never going to be there.
 */
describe('resolveTemplate', () => {
  let dir: string;

  const write = (...segments: string[]) => {
    const file = path.join(dir, ...segments);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{}');
    return file;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-resolve-'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('prefers one sitting in the working directory', () => {
    const here = write(TEMPLATE_NAME);
    write('dist', TEMPLATE_NAME);

    expect(resolveTemplate(undefined, dir)).toBe(here);
  });

  // The case that sent people to a workaround: nothing at the conventional path, exactly
  // one in the build output.
  it('finds the one the build emitted', () => {
    const emitted = write('dist', TEMPLATE_NAME);

    expect(resolveTemplate(undefined, dir)).toBe(emitted);
  });

  it('refuses to choose between several', () => {
    write('dist', TEMPLATE_NAME);
    write('build', TEMPLATE_NAME);

    expect(() => resolveTemplate(undefined, dir)).toThrow(/Several manifest templates found/);
  });

  it('says to build when there is none', () => {
    expect(() => resolveTemplate(undefined, dir)).toThrow(/Build the package first/);
  });

  // A path someone supplied and got wrong should say so rather than resolve elsewhere.
  it('never searches around an explicit path', () => {
    write('dist', TEMPLATE_NAME);

    expect(() => resolveTemplate(path.join(dir, 'nope.json'), dir)).toThrow(
      /Manifest template not found: .*nope\.json/,
    );
  });

  it('ignores node_modules', () => {
    write('node_modules', 'somepkg', TEMPLATE_NAME);

    expect(() => resolveTemplate(undefined, dir)).toThrow(/Build the package first/);
  });
});
