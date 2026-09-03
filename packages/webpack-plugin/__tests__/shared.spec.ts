import { appshellShared } from '../src/shared';

describe('appshellShared', () => {
  // Without one instance for the page, every package reads from an empty store of its own.
  it('should always share the vars runtime as a singleton', () => {
    expect(appshellShared()).toEqual({ '@appshell/runtime': { singleton: true } });
  });

  it('should leave React out unless asked, so a vue package carries none of it', () => {
    expect(Object.keys(appshellShared())).not.toContain('react');
  });

  // RemoteSlot supplies the context useRemote() reads, and they sit either side of a
  // federation boundary — two copies means the hook finds no provider.
  it('should share the bindings and React itself together', () => {
    expect(Object.keys(appshellShared({ react: true }))).toEqual([
      '@appshell/runtime',
      '@appshell/react',
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
    ]);
  });

  /*
   * Federation matches share keys exactly, so `react` does not cover `react/jsx-runtime`.
   * Under the automatic JSX runtime every .tsx file resolves it, so omitting it gives each
   * remote its own copy of the element factory while React itself is a singleton — the
   * same subpath trap `@appshell/runtime` fell into.
   */
  it('should share the jsx runtime, which the react key does not cover', () => {
    const shared = appshellShared({ react: true, dependencies: { react: '18.2.0' } });

    // Pinned to react's range: these ship inside it and cannot be depended on separately.
    expect(shared['react/jsx-runtime']).toEqual({ singleton: true, requiredVersion: '18.2.0' });
    expect(shared['react/jsx-dev-runtime']).toEqual({ singleton: true, requiredVersion: '18.2.0' });
  });

  it('should leave the jsx runtime out when react is not shared', () => {
    expect(Object.keys(appshellShared())).not.toContain('react/jsx-runtime');
  });

  it('should pin a version when the dependency is named', () => {
    const shared = appshellShared({ react: true, dependencies: { react: '18.2.0' } });

    expect(shared.react).toEqual({ singleton: true, requiredVersion: '18.2.0' });
  });

  // Module federation infers the range from the installed package, which is usually right.
  it('should leave the range to federation when it is not named', () => {
    expect(appshellShared({ react: true }).react).toEqual({ singleton: true });
  });

  it('should let a package add something the preset does not know about', () => {
    const shared = appshellShared({ extra: { 'styled-components': { singleton: true } } });

    expect(shared['styled-components']).toEqual({ singleton: true });
    expect(shared['@appshell/runtime']).toEqual({ singleton: true });
  });

  it('should let extra win, since the package knows its own situation', () => {
    const shared = appshellShared({ extra: { '@appshell/runtime': { singleton: false } } });

    expect(shared['@appshell/runtime']).toEqual({ singleton: false });
  });
});
