import fs from 'fs';
import path from 'path';
import configmap from './configmap';
import { toAppshellManifest } from './mappers/appshell.config';
import { AppshellTemplate } from './types';

/**
 * Substitutes a template into the manifest the registry stores.
 *
 * Split out from the file-reading half so a caller holding a template in memory — the
 * webpack plugin, which just built one — does not have to write it to disk and read it
 * back to get a manifest. One substitution pass, one place it can be wrong.
 */
export const manifestFrom = <TMetadata extends Record<string, unknown>>(
  template: AppshellTemplate,
) => toAppshellManifest<TMetadata>(template, configmap.create(template));

/**
 * Generates an appshell manifest
 * @param templatePath path of the appshell manifest template to compile into an appshell manifest
 * @returns an appshell manifest
 */
export default async <TMetadata extends Record<string, unknown>>(templatePath: string) => {
  if (!fs.existsSync(templatePath)) {
    // eslint-disable-next-line no-console
    console.log(`No template file found '${templatePath}'`);

    return null;
  }

  const file = fs.readFileSync(path.resolve(templatePath), 'utf-8');

  return manifestFrom<TMetadata>(JSON.parse(file) as AppshellTemplate);
};
