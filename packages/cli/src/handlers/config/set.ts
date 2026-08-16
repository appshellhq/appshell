/* eslint-disable no-console */
import { camelCase } from 'change-case';
import { readConfig, writeConfig } from '../../../../config/src/utils';

export type SetConfigArgs = {
  config: string;
  key: string;
  value: string;
};

const settable = [
  'registry',
  'environment',
  'scopeId',
  'authIssuer',
  'clientId',
  'apiKey',
  'apiKeyHeader',
];

export default async (argv: SetConfigArgs) => {
  const { config, value } = argv;
  // The file stores kebab-case, so accept either spelling from the command line.
  const key = camelCase(argv.key);

  if (!settable.includes(key)) {
    throw new Error(`Unknown setting '${argv.key}'. Expected one of: ${settable.join(', ')}.`);
  }

  writeConfig(config, { ...readConfig(config), [key]: value });
  console.log(`Set ${key} in ${config}`);
};
