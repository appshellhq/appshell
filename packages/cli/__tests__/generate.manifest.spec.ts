import * as configModule from '@appshell/config';
import * as fs from 'fs';
import generateManifestHandler from '../src/handlers/generate.manifest';

jest.mock('@appshell/config');
jest.mock('fs');

const generateSpy = jest
  .spyOn(configModule, 'generateManifest')
  .mockResolvedValue({ remotes: {}, modules: {}, vars: {} });
const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync');

describe('generate.manifest', () => {
  const template = 'assets/appshell.template.json';
  const outDir = 'assets/';
  const outFile = 'appshell.manifest.json';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process config', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((file) => file === template);
    await generateManifestHandler({
      template,
      outDir,
      outFile,
    });

    expect(generateSpy).toHaveBeenCalled();
    expect(writeFileSyncSpy).toHaveBeenCalled();
  });

  it('should create outDir if it does not exist', async () => {
    const existsSyncSpy = jest
      .spyOn(fs, 'existsSync')
      .mockImplementation((file) => file === template);
    const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync');
    await generateManifestHandler({
      template,
      outDir,
      outFile,
    });

    expect(existsSyncSpy).toHaveBeenCalled();
    expect(mkdirSyncSpy).toHaveBeenCalled();
  });

  // A path someone supplied and got wrong is reported, never searched around: they said
  // where it was, and resolving elsewhere would hide the mistake.
  it('should say so when the template it was given is not there', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(jest.fn());

    await generateManifestHandler({ template, outDir, outFile });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error generating manifest',
      expect.stringContaining(`Manifest template not found: ${template}`),
    );
  });

  it('should say what to do when nothing supplies a template', async () => {
    // Neither the conventional path nor anything the search turns up.
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(jest.fn());

    await generateManifestHandler({ template: undefined, outDir, outFile });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error generating manifest',
      expect.stringContaining('Build the package first, or pass --template'),
    );
  });

  it('should handle gracefully any errors', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((file) => file === template);
    jest.spyOn(fs, 'mkdirSync');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementationOnce(jest.fn());
    generateSpy.mockImplementationOnce(() => {
      throw new Error('test error');
    });

    await generateManifestHandler({
      template,
      outDir,
      outFile,
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error generating manifest', 'test error');
  });
});
