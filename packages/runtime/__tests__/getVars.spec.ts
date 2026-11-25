/* eslint-disable no-underscore-dangle */
import { resetVars, setVars } from '@appshell/runtime';
import { MissingScopeError, MissingVarsError, getVars } from '@appshell/runtime/vars';

// Standing in for the DefinePlugin substitution, which no test runner performs.
const compiledAs = (scope?: string) => {
  const global = globalThis as Record<string, unknown>;

  if (scope === undefined) {
    delete global.__APPSHELL_SCOPE__;
  } else {
    global.__APPSHELL_SCOPE__ = scope;
  }
};

describe('getVars', () => {
  beforeEach(() => {
    resetVars();
    compiledAs('TestModule');
  });

  afterAll(() => compiledAs(undefined));

  it('should read the vars delivered for the scope it was compiled as', () => {
    setVars('TestModule', { ENV_VAR_A: 'a' });

    expect(getVars()).toEqual({ ENV_VAR_A: 'a' });
  });

  it('should not reach another package, whatever else is on the page', () => {
    setVars('TestModule', { ENV_VAR_A: 'mine' });
    setVars('OtherModule', { ENV_VAR_A: 'theirs' });

    expect(getVars()).toEqual({ ENV_VAR_A: 'mine' });
  });

  it('should throw when nothing was delivered for this package', () => {
    setVars('OtherModule', { ENV_VAR_A: 'theirs' });

    expect(() => getVars()).toThrow(MissingVarsError);
  });

  it('should explain itself when the package was built without AppshellPlugin', () => {
    compiledAs(undefined);
    setVars('TestModule', { ENV_VAR_A: 'a' });

    expect(() => getVars()).toThrow(MissingScopeError);
    expect(() => getVars()).toThrow(/AppshellPlugin/);
  });
});
