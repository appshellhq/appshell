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
 *
 * Operates on a copy, because substitution writes in place. Reading a template off disk
 * hid that: every call parsed its own fresh object, so nothing downstream could notice.
 * A caller passing a template it still holds would get its `${VAR}` placeholders replaced
 * underneath it — and the plugin is exactly that caller, building the manifest during
 * `processAssets` and then writing the same template to disk at `afterEmit`.
 */
export const manifestFrom = <TMetadata extends Record<string, unknown>>(
  template: AppshellTemplate,
) => {
  const copy = structuredClone(template);

  return toAppshellManifest<TMetadata>(copy, configmap.create(copy));
};

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
