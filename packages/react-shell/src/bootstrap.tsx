/* eslint-disable react/jsx-props-no-spreading */
import { RemoteSlot } from '@appshell/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import mountOverlayBadge from './overlayBadge';
import './reset.css';

const root = createRoot(document.getElementById('root') as HTMLElement);

// The registry inlines the composition into the document it serves.
const composition = window.__appshell_config__;

// Outside the React root on purpose, so it outlives a crash in the composed app.
mountOverlayBadge(composition);

if (!composition?.root) {
  throw new Error('No root remote to mount. The registry supplies one in the composition.');
}

const remote = composition.root;
const props = composition.rootProps;

// No fallback. What fills the gap before the root remote mounts is the application's
// business, not the shell's — and it has to come from the document, since the thing
// being waited for is the consumer's own code. Until that lands the gap renders as
// whatever the page background is.
root.render(
  <React.StrictMode>
    <RemoteSlot remote={remote} {...props} />
  </React.StrictMode>,
);
