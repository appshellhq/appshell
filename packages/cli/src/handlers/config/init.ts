/* eslint-disable no-console */
import fs from 'fs';
import { isUndefined, omitBy } from 'lodash';
import path from 'path';
import { CliConfig } from '../../../../config/src/types';
import { readConfig, writeConfig } from '../../../../config/src/utils';

export type InitArgs = {
  config: string;
  registry?: string;
  application?: string;
  scopeId?: string;
  authIssuer?: string;
  clientId?: string;
};

export default async (argv: InitArgs) => {
  const { config, registry, application, scopeId, authIssuer, clientId } = argv;

  if (!fs.existsSync(config)) {
    console.log(`Creating configuration file at ${config}`);
    fs.mkdirSync(path.dirname(config), { recursive: true });
  }

  const existing = readConfig(config);

  /*
   * Only values that mean something are written.
   *
   * `application` and `scope-id` used to be seeded with the literal 'default'. Neither is
   * a default anybody chose: there is no requirement that an application exist to publish
   * a package, and 'default' stopped being a scope a principal can write into when scope
   * started coming from the account. Writing them made a placeholder look like a decision,
   * and `application` in particular was read by publish as consent to activate.
   *
   * registry and clientId keep defaults because theirs are real: a local registry listens
   * on 7150, and the cli authenticates as appshell-cli.
   */
  const next = omitBy(
    {
      ...existing,
      registry: registry ?? existing.registry ?? 'http://localhost:7150',
      application: application ?? existing.application,
      scopeId: scopeId ?? existing.scopeId,
      authIssuer: authIssuer ?? existing.authIssuer,
      clientId: clientId ?? existing.clientId ?? 'appshell-cli',
    },
    isUndefined,
  ) as CliConfig;

  writeConfig(config, next);

  console.log(`Wrote ${config}`);

  // A config that parses is not a config that works. Every other value has a default
  // worth having; auth-issuer has none, and its absence surfaces much later as a failed
  // `appshell login` that says nothing about where the value was supposed to come from.
  //
  // Read off what was written rather than off the arguments, so this asks the question it
  // claims to — whether the config now has an issuer — and cannot drift from the merge
  // above if a later edit changes where the value comes from.
  if (!next.authIssuer) {
    console.log(
      "\nauth-issuer is unset, so 'appshell login' will fail. Set it with:\n" +
        '  appshell config init --auth-issuer <issuer-url>',
    );
  }
};
