import { resolveDefaultScope } from '../src/utils/config';

/*
 * `scope-id` became `default-scope`. The old name described identity — *the scope this
 * account has* — and the value has only ever decided where an unqualified name resolves:
 * the registry takes a caller's scope from the token, and publishing takes it from the
 * package name. Neither ever sees this.
 *
 * Stated once because the cli and the webpack plugin both need the answer, and two
 * precedence chains for one setting is how they come to disagree — which is the defect
 * the rename exists to stop people walking into.
 */
describe('resolveDefaultScope', () => {
  const env = (over: Record<string, string> = {}) => over as NodeJS.ProcessEnv;

  it('should read the environment variable', () => {
    const value = resolveDefaultScope({}, env({ APPSHELL_DEFAULT_SCOPE: 'acme' }));

    expect(value).toBe('acme');
  });

  it('should read the config key', () => {
    const value = resolveDefaultScope({ defaultScope: 'acme' }, env());

    expect(value).toBe('acme');
  });

  it('should let the environment win over config', () => {
    const value = resolveDefaultScope(
      { defaultScope: 'from-config' },
      env({ APPSHELL_DEFAULT_SCOPE: 'from-env' }),
    );

    expect(value).toBe('from-env');
  });

  /*
   * Undefined rather than 'default'. That literal named a scope nobody owns and nothing
   * can publish into, so it addressed a namespace guaranteed to be empty — the cli drops
   * through to the working directory's package and then to the account's own scope
   * instead.
   */
  it('should resolve to nothing when it is not set', () => {
    const value = resolveDefaultScope({}, env());

    expect(value).toBeUndefined();
  });
});
