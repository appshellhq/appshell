import installFastRefreshHook from './devtools';

// Must run before `bootstrap` evaluates `react-dom`; see ./devtools.
installFastRefreshHook();

import('./bootstrap');
