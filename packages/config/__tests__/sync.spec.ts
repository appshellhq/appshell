import util, { ChildProcess } from 'child_process';
import { mockDeep } from 'jest-mock-extended';
import sync, * as syncModule from '../src/sync';

describe('sync', () => {
  const workingDir = '/path/to/workingDir';
  const registry = 'http://test.appshell.com';
  const outOfSync = {
    'test-package-1@1.0.0': {
      status: 'conflict' as 'conflict' | 'missing' | 'satisfied',
      packageName: 'test-package-1',
      sampleModule: 'sample-module-1',
      sampleVersion: '2.0.0',
      baselineModule: 'baseline-module-1',
      baselineVersion: '1.0.0',
    },
    'test-package-2@2.0.0': {
      status: 'conflict' as 'conflict' | 'missing' | 'satisfied',
      packageName: 'test-package-2',
      sampleModule: 'sample-module-1',
      sampleVersion: '3.0.0',
      baselineModule: 'baseline-module-1',
      baselineVersion: '2.0.0',
    },
  };

  const duplicateConflicts = {
    'test-package-2@^2.3.0': {
      status: 'conflict' as 'conflict' | 'missing' | 'satisfied',
      packageName: 'test-package-2',
      sampleModule: 'sample-module-1',
      sampleVersion: '3.0.0',
      baselineModule: 'baseline-module-2',
      baselineVersion: '^2.3.0',
    },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should sync all dependencies', async () => {
    const syncDependenciesSpy = jest
      .spyOn(syncModule, 'syncDependencies')
      .mockImplementationOnce(() => Promise.resolve());

    await sync(workingDir, registry, outOfSync);

    expect(syncDependenciesSpy).toHaveBeenCalledWith(
      workingDir,
      registry,
      ['test-package-1@1.0.0', 'test-package-2@2.0.0'],
      expect.anything(),
    );
  });

  it('should sync highest compatable package when multiple conflicts occur with the same package', async () => {
    const syncDependenciesSpy = jest
      .spyOn(syncModule, 'syncDependencies')
      .mockImplementationOnce(() => Promise.resolve());

    await sync(workingDir, registry, {
      ...outOfSync,
      ...duplicateConflicts,
    });

    expect(syncDependenciesSpy).toHaveBeenCalledWith(
      workingDir,
      registry,
      ['test-package-1@1.0.0', 'test-package-2@^2.3.0'],
      expect.anything(),
    );
  });

  it('should sync lowest compatable package when multiple conflicts occur with the same package', async () => {
    const syncDependenciesSpy = jest
      .spyOn(syncModule, 'syncDependencies')
      .mockImplementationOnce(() => Promise.resolve());

    await sync(
      workingDir,
      registry,
      {
        ...outOfSync,
        ...duplicateConflicts,
      },
      'lowest',
    );

    expect(syncDependenciesSpy).toHaveBeenCalledWith(
      workingDir,
      registry,
      ['test-package-1@1.0.0', 'test-package-2@2.0.0'],
      expect.anything(),
    );
  });

  it('should not execute actual sync when dryRun is true', async () => {
    const syncDependenciesSpy = jest
      .spyOn(syncModule, 'syncDependencies')
      .mockImplementationOnce(() => Promise.resolve());

    await sync(
      workingDir,
      registry,
      {
        ...outOfSync,
        ...duplicateConflicts,
      },
      'lowest',
      'npm',
      true,
    );

    expect(syncDependenciesSpy).not.toHaveBeenCalled();
  });

  describe('syncDependencies', () => {
    const mockDataHandler = jest.fn();
    const mockExitHandler = jest.fn();
    const mockErrorHandler = jest.fn();

    const mockOn = jest.fn((event: string, handler: () => void) => {
      if (event === 'data') {
        mockDataHandler.mockImplementationOnce(handler);
      } else if (event === 'exit') {
        mockExitHandler.mockImplementationOnce(handler);
      } else if (event === 'error') {
        mockErrorHandler.mockImplementationOnce(handler);
      }
    }) as any;

    let processSpy: jest.SpyInstance;
    beforeEach(() => {
      processSpy = jest
        .spyOn(util, 'spawn')
        .mockReturnValueOnce(mockDeep<ChildProcess>({ on: mockOn, stdout: { on: mockOn } }));
    });

    afterEach(() => {
      mockDataHandler.mockRestore();
      mockExitHandler.mockRestore();
      mockErrorHandler.mockRestore();
    });

    it('should install dependencies using npm', async () => {
      setTimeout(() => mockDataHandler('installing packages'), 500);
      setTimeout(() => mockExitHandler(0), 1000);

      await syncModule.syncDependencies(
        workingDir,
        registry,
        ['test-package-1@1.0.0', 'test-package-2@2.0.0'],
        'npm',
      );

      expect(processSpy).toHaveBeenCalledWith(
        'npm',
        ['install', 'test-package-1@1.0.0', 'test-package-2@2.0.0', '--force'],
        { cwd: workingDir, stdio: 'inherit', shell: process.platform === 'win32' },
      );
    });

    it('should install dependencies using yarn', async () => {
      setTimeout(() => mockDataHandler('installing packages'), 500);
      setTimeout(() => mockExitHandler(0), 1000);

      await syncModule.syncDependencies(
        workingDir,
        registry,
        ['test-package-1@1.0.0', 'test-package-2@2.0.0'],
        'yarn',
      );

      expect(processSpy).toHaveBeenCalledWith(
        'yarn',
        ['add', 'test-package-1@1.0.0', 'test-package-2@2.0.0', '--force'],
        { cwd: workingDir, stdio: 'inherit', shell: process.platform === 'win32' },
      );
    });

    it('should reject when the package manager cannot be spawned', async () => {
      setTimeout(() => mockErrorHandler(new Error('spawn npm ENOENT')), 500);

      await expect(
        syncModule.syncDependencies(workingDir, registry, ['test-package-1@1.0.0'], 'npm'),
      ).rejects.toThrow('npm failed to install dependencies: spawn npm ENOENT');
    });
  });
});
