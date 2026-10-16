/**
 * One argument, quoted for a POSIX shell only when it needs to be: left bare when every
 * character is one a shell passes through unchanged, single-quoted otherwise, with any single
 * quote inside closed, escaped and reopened.
 */
export const shellQuote = (value: string): string =>
  /^[A-Za-z0-9_@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;

/**
 * The command that restores an unpublished version, to print beside it.
 * appshellhq/appshell-services#29.
 *
 * Complete, so copying it does what it says from anywhere: the scope, and the registry, which
 * a `--registry` override would otherwise leave out. Without it, the hint pointed at the
 * configured registry, where the restore failed, or restored the same coordinates on the wrong
 * server (Copilot on appshellhq/appshell#37).
 */
export const restoreCommand = (args: {
  name: string;
  version: string;
  scopeId: string;
  registry: string;
}): string =>
  [
    'appshell restore',
    shellQuote(args.name),
    shellQuote(args.version),
    '--defaultScope',
    shellQuote(args.scopeId),
    '--registry',
    shellQuote(args.registry),
  ].join(' ');
