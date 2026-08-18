/* eslint-disable no-console */

import { camelCase, kebabCase } from 'change-case';
import fs from 'fs';
import { defaults } from 'lodash';
import yaml from 'yaml';
import yargs from 'yargs';
import { CliConfig } from '../types';

const readYaml = <T>(file: string) => yaml.parse(fs.readFileSync(file, 'utf-8')) as T;

export const readConfig = (configPath: string) => {
  console.debug(`Reading config from ${configPath}`);
  if (fs.existsSync(configPath)) {
    const config = readYaml<CliConfig>(configPath) ?? ({} as CliConfig);

    console.debug(`Raw config: ${JSON.stringify(config, null, 2)}`);

    const sanitizedConfig = Object.entries(config).reduce((acc, [key, curr]) => {
      acc[camelCase(key)] = curr;
      return acc;
    }, {} as Record<string, string>) as CliConfig;

    console.debug(`Sanitized config: ${JSON.stringify(sanitizedConfig, null, 2)}`);

    return sanitizedConfig;
  }

  return {} as CliConfig;
};

export const writeConfig = (configPath: string, config: CliConfig) => {
  console.debug(`Writing config to ${configPath}`);
  console.debug(`Raw config: ${JSON.stringify(config, null, 2)}`);

  const sanitizedConfig = Object.entries(config).reduce((acc, [key, curr]) => {
    acc[kebabCase(key)] = curr;
    return acc;
  }, {} as Record<string, string>) as CliConfig;

  const configFileContent = yaml.stringify(sanitizedConfig);

  console.debug(`Sanitized config: ${JSON.stringify(sanitizedConfig, null, 2)}`);

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
