import { AppshellManifest } from '@appshell/config';

export default {
  remotes: {
    'TestModule/TestComponent': {
      id: 'test-component',
      loader: {
        apiVersion: 'federation.appshell.org/v1' as const,
        kind: 'ModuleFederation' as const,
        scope: 'TestModule',
        module: './TestComponent',
        filename: 'remoteEntry.js',
      },
      manifestUrl: 'http://test.com/appshell.manifest.json',
      remoteEntryUrl: 'http://test.com/remoteEntry.js',
      metadata: {},
    },
  },
  modules: {},
  vars: {},
} as AppshellManifest;
