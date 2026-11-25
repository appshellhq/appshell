/* eslint-disable no-console */
import { camelCase } from 'change-case';
import { CLI_SETTINGS } from '../../../../config/src/types';
import { readConfig, writeConfig } from '../../../../config/src/utils';

export type SetConfigArgs = {
  config: string;
  key: string;
  value: string;
};

const settable: readonly string[] = CLI_SETTINGS;

export default async (argv: SetConfigArgs) => {
  const { config, value } = argv;
  // The file stores kebab-case, so accept either spelling from the command line.
  const key = camelCase(argv.key);

  if (!settable.includes(key)) {
    throw new Error(`Unknown setting '${argv.key}'. Expected one of: ${settable.join(', ')}.`);
  }

  // A switch, and a typo in one would read as on.
  if (key === 'pkce' && !['true', 'false'].includes(value)) {
    throw new Error(`'${argv.key}' is true or false, not '${value}'.`);
  }

  writeConfig(config, { ...readConfig(config), [key]: value });
  console.log(`Set ${key} in ${config}`);
};
