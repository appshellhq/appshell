import { clone } from '../src/handlers/app';
import { RegistryClient } from '../src/util/registry';

// Resolving the caller's scope asks the registry which scopes they own. Both applications here
// are named with their scopes, so the answer is never used, only asked for.
jest.mock('../src/util/scope', () => ({
  resolveScopeId: jest.fn().mockResolvedValue('acme'),
  resetScopeCache: jest.fn(),
}));

/*
 * #28. A clone never inherits its source's permission to take overlays, so someone trying
 * appshell asks for it in the clone itself: one request, so the copy is never left without it.
 */
describe('app clone', () => {
  let cloneSpy: jest.SpyInstance;
  let log: jest.SpyInstance;

  const argv = (more: { allowOverlays?: boolean } = {}) => ({
    registry: 'http://test.com',
    scopeId: 'acme',
    from: 'appshell/appshell-example',
    to: 'acme/example',
    ...more,
  });

  beforeEach(() => {
    cloneSpy = jest
      .spyOn(RegistryClient.prototype, 'cloneApplication')
      .mockResolvedValue({ id: 'acme/example' });
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('should ask for overlays in the clone itself when told to', async () => {
    await clone(argv({ allowOverlays: true }));

    expect(cloneSpy).toHaveBeenCalledTimes(1);
    expect(cloneSpy).toHaveBeenCalledWith('acme', 'example', {
      fromScopeId: 'appshell',
      fromName: 'appshell-example',
      ephemeral: undefined,
      allowOverlays: true,
    });
    expect(log.mock.calls[0][0]).toContain('with overlays allowed');
  });

  it('should leave them to the registry, off, when not told to', async () => {
    await clone(argv());

    expect(cloneSpy.mock.calls[0][2].allowOverlays).toBeUndefined();
    expect(log.mock.calls[0][0]).not.toContain('overlays');
  });
});
