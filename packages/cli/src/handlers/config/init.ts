/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { readConfig, writeConfig } from '../../../../config/src/utils';

export type InitArgs = {
  config: string;
  registry?: string;
  environment?: string;
  scopeId?: string;
  authIssuer?: string;
  clientId?: string;
};

export default async (argv: InitArgs) => {
  const { config, registry, environment, scopeId, authIssuer, clientId } = argv;

  if (!fs.existsSync(config)) {
    console.log(`Creating configuration file at ${config}`);
    fs.mkdirSync(path.dirname(config), { recursive: true });
  }

  const existing = readConfig(config);

  writeConfig(config, {
    ...existing,
    registry: registry ?? existing.registry ?? 'http://localhost:7150',
    environment: environment ?? existing.environment ?? 'default',
    scopeId: scopeId ?? existing.scopeId ?? 'default',
    authIssuer: authIssuer ?? existing.authIssuer ?? '',
    clientId: clientId ?? existing.clientId ?? 'appshell-cli',
  });

  console.log(`Wrote ${config}`);
};
