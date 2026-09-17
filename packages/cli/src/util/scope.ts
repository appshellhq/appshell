import { parsePackageName } from '@appshell/config';
import fs from 'fs';
import path from 'path';
import { RegistryClient } from './registry';

/**
 * Which namespace an unqualified name belongs to.
 *
 * `appshell app list --application dev` has to turn `dev` into `<scope>/dev`, and the
 * scope it picks used to come from `~/.appshell/config` alone, defaulting to the literal
 * `default`. That was a second source of truth: `publish` took the scope from the package
 * name while everything else took it from config, so `@acme/foo` published into `acme`
 * and was then looked for in `default`. The publish succeeded and the package appeared to
 * have vanished.
 *
 * `default` is also no longer a place. It was a shared writable scope once, so addressing
 * it at least found things; now nobody owns it and nothing can publish into it, which
 * makes it a fallback guaranteed to be empty.
 *
 * So the scope is resolved rather than assumed, in the order the answer is most likely to
 * be the one meant:
 *
 *   1. what the caller said, via `--scopeId`, `APPSHELL_SCOPE_ID`, or config
 *   2. what the package in this directory declares
 *   3. the scope the caller's account owns
 *
 * Two before three because a repository's declared scope is checked in, visible in
 * review, and identical for everyone, and it is already where `publish` sends the
 * package, which is the agreement this whole issue was about. Three exists so the common
 * case needs no configuration at all: one account, one scope, nothing to set.
 */

/** Keyed on everything that can change the answer, so a command resolves once. */
const memo = new Map<string, Promise<string>>();

/** Exported for tests; a process otherwise resolves each distinct question once. */
export const resetScopeCache = () => memo.clear();

/**
 * The scope this directory's package declares, if it declares one.
 *
 * Deliberately quiet. Every failure here, whether no `package.json`, unreadable,
 * unparseable, or an unscoped name, means only that this directory does not answer the
 * question, and the next source does. Reusing `identify` would be wrong: it demands a
 * name and version because publishing needs them, and not being in a package is not an
 * error when all that is being asked is where to look something up.
 */
export const declaredScope = (cwd: string): string | undefined => {
  try {
    const file = path.resolve(cwd, 'package.json');
    if (!fs.existsSync(file)) return undefined;

    const { name } = JSON.parse(fs.readFileSync(file, 'utf-8')) as { name?: string };

    return name ? parsePackageName(name).scopeId : undefined;
  } catch {
    return undefined;
  }
};

const fromAccount = async (registry: string): Promise<string> => {
  const scopes = await new RegistryClient(registry).listScopes();

  if (scopes.length === 1) return scopes[0].id;

  if (!scopes.length) {
    throw new Error(
      'No scope to address. Your account owns none yet, so publish to provision your own, ' +
        "or claim a name with 'appshell scopes create <name>'.",
    );
  }

  // Picking one would be a guess, and the point of resolving at all is that a wrong guess
  // is silent: the command succeeds against the wrong namespace and finds nothing.
  throw new Error(
    `Your account owns ${scopes.length} scopes, so which one is meant is ambiguous: ` +
      `${scopes.map((scope) => scope.id).join(', ')}. Qualify the name as 'scope/name', ` +
      "pass --scopeId, or set a default with 'appshell config set scopeId <name>'.",
  );
};

export const resolveScopeId = async (
  argv: { registry: string; scopeId?: string },
  cwd: string = process.cwd(),
): Promise<string> => {
  if (argv.scopeId) return argv.scopeId;

  const declared = declaredScope(cwd);
  if (declared) return declared;

  const key = `${argv.registry} ${cwd}`;
  const pending = memo.get(key) ?? fromAccount(argv.registry);
  memo.set(key, pending);

  try {
    return await pending;
  } catch (error) {
    // A failure is not worth remembering: the next command may run after a login, or
    // after the scope it complained about being missing was claimed.
    memo.delete(key);

    throw error;
  }
};
