/* eslint-disable no-console */

import { camelCase, kebabCase } from 'change-case';
import fs from 'fs';
import { defaults } from 'lodash';
import yaml from 'yaml';
import yargs from 'yargs';
import { CliConfig } from '../types';

const readYaml = <T>(file: string) => yaml.parse(fs.readFileSync(file, 'utf-8')) as T;

/*
 * Silent on purpose. It used to debug-log the file it read and the config twice over,
 * which every caller then had to suppress — `loadConfig` in the cli replaced console.debug
 * around each call to do it. A logger nobody may hear is not a logger, and the first call
 * site that forgot the ritual printed the whole config on every command.
 *
 * The config carries `apiKey`, so what it printed was a credential.
 */
/**
 * The addressing default: which namespace an unqualified name resolves to.
 *
 * Named `default-scope` and not `scope-id`, because the old name described identity —
 * *the scope this account has* — and the value has never been that. The registry takes a
 * caller's scope from the token and publishing takes it from the package name; this
 * reaches neither. A `scope-id` deciding where names resolved while something else decided
 * where writes landed is how the two came to disagree without anything saying so.
 *
 * Stated once because the cli and the webpack plugin both need the answer, and two
 * precedence chains for one setting is how they drift apart.
 */
export const resolveDefaultScope = (
  config: { defaultScope?: string },
  env: NodeJS.ProcessEnv = process.env,
): string | undefined => env.APPSHELL_DEFAULT_SCOPE || config.defaultScope;

export const readConfig = (configPath: string) => {
  if (fs.existsSync(configPath)) {
    const config = readYaml<CliConfig>(configPath) ?? ({} as CliConfig);

    const sanitizedConfig = Object.entries(config).reduce((acc, [key, curr]) => {
      acc[camelCase(key)] = curr;
      return acc;
    }, {} as Record<string, string>) as CliConfig;

    return sanitizedConfig;
  }

  return {} as CliConfig;
};

export const writeConfig = (configPath: string, config: CliConfig) => {
  console.debug(`Writing config to ${configPath}`);

  const sanitizedConfig = Object.entries(config).reduce((acc, [key, curr]) => {
    acc[kebabCase(key)] = curr;
    return acc;
  }, {} as Record<string, string>) as CliConfig;

  // Not logged, for the same reason as reading it: the config carries a credential.
  const configFileContent = yaml.stringify(sanitizedConfig);

  fs.writeFileSync(configPath, configFileContent);
};

export const mergeConfigWithArgs = (config: CliConfig, argv: yargs.ArgumentsCamelCase<unknown>) => {
  console.debug(`Merging config with args...`);
  console.debug(`Initial argv: `, argv);
  const argStr = Object.entries(config).reduce(
    (acc, [key, curr]) => acc.concat(`--${key} ${curr} `),
    '',
  );

  console.debug(`Parsing args: ${argStr}`);
  const args = yargs(argStr).parse();
  console.debug('Parsed args: ', args);

  defaults(argv, args);

  console.debug(`Final argv: `, argv);
};
