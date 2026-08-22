/* eslint-disable react/jsx-props-no-spreading */
import { APPSHELL_ENV } from '@appshell/core';
import { ReactHost } from '@appshell/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import Splash from './components/Splash';
import mountOverlayBadge from './overlayBadge';
import reportWebVitals from './reportWebVitals';
import './reset.css';

const root = createRoot(document.getElementById('root') as HTMLElement);

// A registry-served shell inlines these; the build-time env is the standalone fallback.
const composition = window.__appshell_config__;

// Outside the React root on purpose, so it outlives a crash in the composed app.
mountOverlayBadge(composition);

const remote = composition?.root || APPSHELL_ENV.APPSHELL_ROOT;
const props = composition?.rootProps ?? JSON.parse(APPSHELL_ENV.APPSHELL_ROOT_PROPS);

if (!remote) {
  throw new Error(
    `No root remote to mount. The registry supplies one; a standalone build needs APPSHELL_ROOT.`,
  );
}

root.render(
  <React.StrictMode>
    <ReactHost
      configUrl={composition ? undefined : APPSHELL_ENV.APPSHELL_CONFIG_URL}
      remote={remote}
      fallback={<Splash />}
      {...props}
    />
  </React.StrictMode>,
);

reportWebVitals();
