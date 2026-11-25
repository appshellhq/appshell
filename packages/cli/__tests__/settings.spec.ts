/* eslint-disable no-template-curly-in-string -- ${VAR} is the declaration under test */
import { settings } from '../src/handlers/app';
import { parsePackage } from '../src/util/registry';

/*
 * `--set NAME=value` resolves the scope from the package rather than asking the author to
 * type it. The package already says which names it declares and under which scope, so
 * repeating it at the call site would be a second place to be wrong — and a name the
 * package does not declare is a typo worth refusing before the request.
 */
const declared = {
  ContainerModule: { SUPPORT_URL: '${SUPPORT_URL}', TIMEOUT_MS: 5000 },
};

describe('settings', () => {
  it('should resolve the scope from what the package declares', () => {
    expect(settings(['SUPPORT_URL=https://support.acme.com'], declared)).toEqual({
      ContainerModule: { SUPPORT_URL: 'https://support.acme.com' },
    });
  });

  it('should collect several into one scope', () => {
    expect(settings(['SUPPORT_URL=a', 'TIMEOUT_MS=100'], declared)).toEqual({
      ContainerModule: { SUPPORT_URL: 'a', TIMEOUT_MS: '100' },
    });
  });

  // A value may contain '=' — a query string or a base64 padding — so only the first splits.
  it('should split on the first equals only', () => {
    expect(settings(['SUPPORT_URL=https://x.com/?a=b&c=d'], declared)).toEqual({
      ContainerModule: { SUPPORT_URL: 'https://x.com/?a=b&c=d' },
    });
  });

  it('should refuse a name the package does not declare, and say what it does', () => {
    expect(() => settings(['SUPPORT_UR=typo'], declared)).toThrow(
      /Nothing declares SUPPORT_UR.*ContainerModule\.SUPPORT_URL/s,
    );
  });

  it('should refuse something that is not a setting', () => {
    expect(() => settings(['SUPPORT_URL'], declared)).toThrow(/not a setting/);
  });

  it('should accept an explicit scope', () => {
    expect(settings(['ContainerModule.SUPPORT_URL=x'], declared)).toEqual({
      ContainerModule: { SUPPORT_URL: 'x' },
    });
  });

  // Nothing declares one name under two scopes today, but the syntax cannot rule it out.
  it('should ask for a qualifier when a name is ambiguous', () => {
    expect(() => settings(['A=x'], { One: { A: '${A}' }, Two: { A: '${A}' } })).toThrow(
      /more than one scope: One, Two/,
    );
  });

  it('should send nothing when nothing was set', () => {
    expect(settings(undefined, declared)).toBeUndefined();
    expect(settings([], declared)).toBeUndefined();
  });
});

/*
 * A package reference carries a version and an application never does. Sharing one parser
 * is how a version ends up silently treated as part of a name.
 */
describe('parsePackage', () => {
  it('should read full coordinates', () => {
    expect(parsePackage('acme/pong@1.2.3', 'default')).toEqual({
      scopeId: 'acme',
      name: 'pong',
      version: '1.2.3',
    });
  });

  it('should fall back to the caller scope', () => {
    expect(parsePackage('pong@1.2.3', 'acme')).toEqual({
      scopeId: 'acme',
      name: 'pong',
      version: '1.2.3',
    });
  });

  // The application decides which build runs, so a reference without one is not a request
  // it can serve.
  it('should refuse a reference with no version', () => {
    expect(() => parsePackage('acme/pong', 'default')).toThrow(/Expected 'scope\/name@version'/);
  });
});
