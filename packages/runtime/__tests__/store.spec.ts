import {
  MissingVarsError,
  VarsConflictError,
  hasVars,
  readVars,
  resetVars,
  setVars,
} from '@appshell/runtime';

describe('vars store', () => {
  beforeEach(() => resetVars());

  it('should hand a scope back the vars delivered for it', () => {
    setVars('TestModule', { ENV_VAR_A: 'a', COUNT: 2 });

    expect(readVars('TestModule')).toEqual({ ENV_VAR_A: 'a', COUNT: 2 });
  });

  it('should keep scopes apart', () => {
    setVars('TestModule', { ENV_VAR_A: 'a' });
    setVars('OtherModule', { ENV_VAR_A: 'b' });

    expect(readVars('TestModule')).toEqual({ ENV_VAR_A: 'a' });
    expect(readVars('OtherModule')).toEqual({ ENV_VAR_A: 'b' });
  });

  it('should throw rather than hand back an empty object for an undelivered scope', () => {
    expect(() => readVars('TestModule')).toThrow(MissingVarsError);
  });

  it('should name the scopes it does have, since a mismatched scope is the likely cause', () => {
    setVars('TestModule', { ENV_VAR_A: 'a' });

    expect(() => readVars('Testmodule')).toThrow(/'TestModule'/);
  });

  it('should point at the shared singleton when nothing has been delivered at all', () => {
    expect(() => readVars('TestModule')).toThrow(/shared singleton/);
  });

  // The same remote can be mounted more than once, and both resolvers read the scope's
  // vars from the same composition — so a repeat delivery is expected and identical.
  it('should ignore a repeat delivery of identical vars', () => {
    setVars('TestModule', { ENV_VAR_A: 'a' });

    expect(() => setVars('TestModule', { ENV_VAR_A: 'a' })).not.toThrow();
    expect(readVars('TestModule')).toEqual({ ENV_VAR_A: 'a' });
  });

  it('should refuse to replace vars that were already delivered', () => {
    setVars('TestModule', { ENV_VAR_A: 'a' });

    expect(() => setVars('TestModule', { ENV_VAR_A: 'overwritten' })).toThrow(VarsConflictError);
    expect(readVars('TestModule')).toEqual({ ENV_VAR_A: 'a' });
  });

  it('should treat a dropped key as a replacement, not a match', () => {
    setVars('TestModule', { ENV_VAR_A: 'a', ENV_VAR_B: 'b' });

    expect(() => setVars('TestModule', { ENV_VAR_A: 'a' })).toThrow(VarsConflictError);
  });

  it('should hand back vars a package cannot mutate', () => {
    setVars('TestModule', { ENV_VAR_A: 'a' });

    const vars = readVars('TestModule');

    expect(() => {
      (vars as Record<string, unknown>).ENV_VAR_A = 'mutated';
    }).toThrow();
    expect(readVars('TestModule')).toEqual({ ENV_VAR_A: 'a' });
  });

  it('should not be affected by later mutation of the object it was given', () => {
    const vars = { ENV_VAR_A: 'a' };
    setVars('TestModule', vars);

    vars.ENV_VAR_A = 'mutated';

    expect(readVars('TestModule')).toEqual({ ENV_VAR_A: 'a' });
  });

  it('should report whether a scope has been delivered', () => {
    expect(hasVars('TestModule')).toBe(false);

    setVars('TestModule', { ENV_VAR_A: 'a' });

    expect(hasVars('TestModule')).toBe(true);
  });
});
