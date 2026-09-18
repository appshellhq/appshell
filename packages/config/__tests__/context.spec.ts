import os from 'os';
import path from 'path';
import { resolveContext } from '../src/context';

jest.mock('../src/credentials', () => ({ resolveToken: () => undefined }));

/*
 * `resolveContext` is what the webpack plugin uses to defer to `appshell config set` and
 * `appshell login` instead of demanding per-project configuration. It used to invent a
 * scope when none was configured — the literal `default`, which names a namespace nobody
 * owns and nothing can publish into — so an unqualified application became `default/thing`
 * and the plugin activated into a place guaranteed to be empty.
 *
 * appshellhq/appshell#3 removed that fallback from the cli. This was the copy of it nobody
 * had found.
 */
describe('resolveContext', () => {
  const nowhere = path.join(os.tmpdir(), 'appshell-no-such-config');

  beforeEach(() => {
    process.env.APPSHELL_CONFIG = nowhere;
    delete process.env.APPSHELL_DEFAULT_SCOPE;
    delete process.env.APPSHELL_APPLICATION;
  });

  afterEach(() => {
    delete process.env.APPSHELL_CONFIG;
    delete process.env.APPSHELL_DEFAULT_SCOPE;
    delete process.env.APPSHELL_APPLICATION;
  });

  it('should qualify an application with the configured scope', () => {
    process.env.APPSHELL_DEFAULT_SCOPE = 'acme';
    process.env.APPSHELL_APPLICATION = 'storefront';

    expect(resolveContext().application).toBe('acme/storefront');
  });

  /*
   * Left alone rather than made up. `activate` refuses an unqualified value with
   * `Invalid application 'storefront'. Expected 'scope/name'.` — true and actionable,
   * where `default/storefront` was neither: it named a real-looking address that no
   * composition holds, so activation appeared to work and changed nothing.
   */
  it('should leave an application unqualified when no scope is configured', () => {
    process.env.APPSHELL_APPLICATION = 'storefront';

    expect(resolveContext().application).toBe('storefront');
  });

  it('should not invent a scope when none is configured', () => {
    expect(resolveContext().scopeId).toBeUndefined();
  });

  it('should leave an already-qualified application alone', () => {
    process.env.APPSHELL_DEFAULT_SCOPE = 'acme';
    process.env.APPSHELL_APPLICATION = 'other/storefront';

    // The name wins over the default, the same precedence the cli's resolveScopeId uses.
    expect(resolveContext().application).toBe('other/storefront');
  });

  it('should report no application when none is named', () => {
    process.env.APPSHELL_DEFAULT_SCOPE = 'acme';

    expect(resolveContext().application).toBeUndefined();
  });
});
