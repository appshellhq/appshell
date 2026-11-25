/* eslint-disable react/jsx-props-no-spreading */
import { RemoteSlot } from '@appshell/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import mountOverlayBadge from './overlayBadge';
import './reset.css';
import dismissSplashWhenMounted from './splash';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

// The registry inlines the composition into the document it serves.
const composition = window.__appshell_config__;

// Outside the React root on purpose, so it outlives a crash in the composed app.
mountOverlayBadge(composition);

if (!composition?.root) {
  throw new Error('No root remote to mount. The registry supplies one in the composition.');
}

const remote = composition.root;
const props = composition.rootProps;

// No fallback here. What covers the gap before the root package mounts is in the document
// the registry served — it has to be, because the thing being waited for is the package's
// own code, and this bundle is fetched before it. All the shell does is take it away.
dismissSplashWhenMounted(container);

root.render(
  <React.StrictMode>
    <RemoteSlot remote={remote} {...props} />
  </React.StrictMode>,
);
