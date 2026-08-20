/** @jest-environment jsdom */

jest.mock('@module-federation/enhanced/runtime', () => ({
  init: jest.fn(),
  getInstance: jest.fn(() => null),
  registerRemotes: jest.fn(),
  loadRemote: jest.fn(),
}));

type ComponentType = () => string;
const TestComponent: ComponentType = () => 'test component';

describe('loadAppshellComponent', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should load the Appshell component via the federation runtime', async () => {
    const runtime = await import('@module-federation/enhanced/runtime');
    (runtime.loadRemote as jest.Mock).mockResolvedValue({ default: TestComponent });
    const loadAppshellComponent = (await import('../src/loadAppshellComponent')).default;

    const Component = await loadAppshellComponent<ComponentType>(
      'TestModule',
      './TestComponent',
      'http://test.com/remoteEntry.js',
    );

    expect(Component).toBe(TestComponent);
    expect(runtime.registerRemotes).toHaveBeenCalledWith([
      { name: 'TestModule', entry: 'http://test.com/remoteEntry.js' },
    ]);
    expect(runtime.loadRemote).toHaveBeenCalledWith('TestModule/TestComponent');
  });

  it('should initialize the runtime and register each scope only once', async () => {
    const runtime = await import('@module-federation/enhanced/runtime');
    (runtime.loadRemote as jest.Mock).mockResolvedValue({ default: TestComponent });
    const loadAppshellComponent = (await import('../src/loadAppshellComponent')).default;

    await loadAppshellComponent('TestModule', './TestComponent', 'http://test.com/remoteEntry.js');
    await loadAppshellComponent('TestModule', './TestComponent', 'http://test.com/remoteEntry.js');

    expect(runtime.init).toHaveBeenCalledTimes(1);
    expect(runtime.registerRemotes).toHaveBeenCalledTimes(1);
  });

  it('should throw if the remote module cannot be loaded', async () => {
    const runtime = await import('@module-federation/enhanced/runtime');
    (runtime.loadRemote as jest.Mock).mockResolvedValue(null);
    const loadAppshellComponent = (await import('../src/loadAppshellComponent')).default;

    await expect(
      loadAppshellComponent('TestModule', './TestComponent', 'http://test.com/remoteEntry.js'),
    ).rejects.toThrow(/Failed to find module container/i);
  });

  it('should not call init when a host federation instance already exists', async () => {
    const runtime = await import('@module-federation/enhanced/runtime');
    (runtime.getInstance as jest.Mock).mockReturnValue({});
    (runtime.loadRemote as jest.Mock).mockResolvedValue({ default: TestComponent });
    const loadAppshellComponent = (await import('../src/loadAppshellComponent')).default;

    await loadAppshellComponent('TestModule', './TestComponent', 'http://test.com/remoteEntry.js');

    expect(runtime.init).not.toHaveBeenCalled();
  });
});
