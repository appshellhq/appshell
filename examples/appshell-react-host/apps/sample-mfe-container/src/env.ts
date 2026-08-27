/**
 * This package's runtime configuration, as the registry composed it — the vars declared
 * in appshell.config.yaml, with the application's overrides layered over them.
 *
 * `getVars()` needs no scope: AppshellPlugin compiles this package's federation name in,
 * so it can only ever return this package's own vars. It throws if nothing was delivered,
 * which is the check this file used to have to write by hand.
 */
import { getVars } from '@appshell/vars';

export default getVars<{ BACKGROUND_COLOR: string }>();
