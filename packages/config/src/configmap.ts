import { entries, set, values } from 'lodash';
import { AppshellConfig, ConfigMap } from './types';

const matchVariable = /(\${\w+})/;
const matchWord = /[^\w @]/g;

const findVariables = (val: string) =>
  val
    .split(matchVariable)
    .filter((w) => w.match(matchVariable))
    ?.map((w) => w.replace(matchWord, ''));

const findVariablePlaceholders = (
  obj: object | string | number | undefined,
  results: Record<string, string> = {},
): Record<string, string> =>
  values(obj).reduce((acc: Record<string, string>, val: object | string | number | undefined) => {
    if (typeof val === 'string') {
      const VARS = findVariables(val);
      return VARS.length > 0 ? VARS.reduce((a, v) => set(a, v, process.env[v]), acc) : acc;
    }
    if (typeof val === 'object') {
      return findVariablePlaceholders(val, acc);
    }
    return acc;
  }, results);

const apply = <T extends object>(obj: T, configMap: ConfigMap): T => {
  entries(obj).forEach(([key, val]) => {
    if (typeof val === 'string') {
      const VARS = findVariables(val);
      if (VARS.length > 0) {
        VARS.forEach((v) => {
          const cur = obj[key as keyof T] as string;
          const value = configMap[v];
          /*
           * Left as a placeholder when nothing supplies it, rather than substituted.
           *
           * This used to write the string "undefined" — not a value, not absent, and
           * truthy, so nothing downstream could catch it and a package would render a link
           * to `undefined`. A placeholder that survives says exactly what happened: this
           * name was declared and nobody supplied it, at whichever layer was meant to. It
           * is also what makes an unsupplied var detectable at all, since the rule is
           * simply "still matches ${...}".
           */
          if (value === undefined) {
            // eslint-disable-next-line no-console
            console.warn(`${v} is not set; leaving its placeholder unresolved.`);
            return;
          }

          set<string>(obj, key, cur.replace(`$\{${v}}`, value));
        });
      }
    } else if (typeof val === 'object') {
      apply(val, configMap);
    }
  });

  return obj;
};

const create = (config: AppshellConfig) => findVariablePlaceholders(config);

export default {
  apply,
  create,
};
