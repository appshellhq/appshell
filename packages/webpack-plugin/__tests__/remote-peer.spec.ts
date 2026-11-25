import { appshellRemote } from '../src/remote';

// A package using AppshellPlugin alone needn't install Module Federation, so appshellRemote()
// loads it only when called, and says what's missing rather than failing with a bare require.
jest.mock('@module-federation/enhanced/webpack', () => {
  throw Object.assign(new Error("Cannot find module '@module-federation/enhanced/webpack'"), {
    code: 'MODULE_NOT_FOUND',
  });
});

describe('appshellRemote without Module Federation installed', () => {
  it('should say what to install', () => {
    expect(() =>
      appshellRemote({
        name: 'PackagesModule',
        exposes: { './Packages': './src/Packages' },
        port: 7302,
      }),
    ).toThrow('npm install --save-dev @module-federation/enhanced');
  });
});
