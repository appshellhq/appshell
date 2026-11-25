import { clone } from '../src/handlers/app';
import { RegistryClient } from '../src/util/registry';

/*
 * #28. A clone never inherits its source's permission to take overlays, so someone trying
 * appshell asks for it in the clone itself: one request, so the copy is never left without it.
 */
describe('app clone', () => {
  let cloneSpy: jest.SpyInstance;
  let listScopes: jest.SpyInstance;
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
    // Asking needs the write role, so a reader, or an account with no scope yet, was refused.
    listScopes = jest
      .spyOn(RegistryClient.prototype, 'listScopes')
      .mockRejectedValue(new Error('403 This action requires the publisher role'));
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

  /*
   * appshellhq/appshell-services#125. Both names say their scope, so there's nothing to look up.
   * It used to ask which scopes the account owns anyway, and an account that may only read, or
   * owns none yet, couldn't clone into a name it qualified.
   */
  it('should not ask which scopes the account owns when both names say theirs', async () => {
    await clone(argv());

    expect(listScopes).not.toHaveBeenCalled();
    expect(cloneSpy).toHaveBeenCalledWith('acme', 'example', expect.anything());
  });

  it('should leave them to the registry, off, when not told to', async () => {
    await clone(argv());

    expect(cloneSpy.mock.calls[0][2].allowOverlays).toBeUndefined();
    expect(log.mock.calls[0][0]).not.toContain('overlays');
  });
});
