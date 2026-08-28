/**
 * This package's runtime configuration, as the registry composed it — the vars declared
 * in appshell.config.yaml, with the application's overrides layered over them.
 *
 * `getVars()` needs no scope: AppshellPlugin compiles this package's federation name in,
 * so it can only ever return this package's own vars.
 *
 * Note what is *not* here. Colour used to arrive this way, as a `BACKGROUND_COLOR` var,
 * and it was the wrong channel for it: appearance belongs to the Application's theme,
 * which reaches every package at once through the design tokens. Vars are for
 * configuration a package has to branch on — a url, an endpoint, a feature flag.
 */
import { getVars } from '@appshell/runtime/vars';

export default getVars<{ SUPPORT_URL: string }>();
