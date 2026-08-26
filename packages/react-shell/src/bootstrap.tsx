/* eslint-disable react/jsx-props-no-spreading */
import { RemoteSlot } from '@appshell/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import Splash from './components/Splash';
import mountOverlayBadge from './overlayBadge';
import reportWebVitals from './reportWebVitals';
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

root.render(
  <React.StrictMode>
    <RemoteSlot remote={remote} fallback={<Splash />} {...props} />
  </React.StrictMode>,
);

reportWebVitals();
