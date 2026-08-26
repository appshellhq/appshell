/* eslint-disable no-console */
import chalk from 'chalk';
import { compact, keys, uniq, uniqBy, values } from 'lodash';
import { validate } from 'schema-utils';
import { Schema } from 'schema-utils/declarations/validate';
import schema from '../schemas/appshell.template.json';
import { AppshellTemplate, ConfigValidator } from '../types';

const hasIDCollisions = (...documents: AppshellTemplate[]) => {
  const allRemotes = compact(documents.flatMap((document) => values(document.remotes)));
  const uniqueIds = uniqBy(allRemotes, (remote) => remote.id);

  return uniqueIds.length !== allRemotes.length;
};

const hasRemoteCollisions = (...documents: AppshellTemplate[]) => {
  const allRemoteKeys = documents.flatMap((document) => keys(document.remotes));
  const uniqueRemotes = uniq(allRemoteKeys);

  return uniqueRemotes.length !== allRemoteKeys.length;
};

const hasVarsCollisions = (...documents: AppshellTemplate[]) => {
  const allVarKeys = documents.flatMap((document) => keys(document.vars));
  const uniqueVars = uniq(allVarKeys);

  return uniqueVars.length !== allVarKeys.length;
};

export default {
  validate: (...documents: AppshellTemplate[]) => {
    // schema validation
    documents.forEach((document) => validate(schema as Schema, document));

    // logical validation
    if (hasIDCollisions(...documents)) {
      console.log(chalk.yellow('Multiple remotes with the same ID'));
    }

    if (hasRemoteCollisions(...documents)) {
      console.log(chalk.yellow('Multiple remotes with the same key'));
    }

    if (hasVarsCollisions(...documents)) {
      console.log(chalk.yellow('Multiple vars with the same key'));
    }
  },
} as ConfigValidator;
