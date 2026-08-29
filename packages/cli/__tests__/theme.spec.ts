import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseRef, publish } from '../src/handlers/theme';

describe('parseRef', () => {
  it('reads full coordinates', () => {
    expect(parseRef('acme/brand@1.2.3', 'default')).toEqual({
      scopeId: 'acme',
      name: 'brand',
      version: '1.2.3',
    });
  });

  // Omitting the version means "whatever is latest", which the registry resolves.
  it('leaves the version undefined when none is given', () => {
    expect(parseRef('acme/brand', 'default')).toEqual({
      scopeId: 'acme',
      name: 'brand',
      version: undefined,
    });
  });

  // A bare name resolves in the caller's scope, the way `appshell app` already behaves.
  it('falls back to the caller scope for a bare name', () => {
    expect(parseRef('brand', 'acme')).toEqual({
      scopeId: 'acme',
      name: 'brand',
      version: undefined,
    });
  });

  it('reads a bare name with a version', () => {
    expect(parseRef('brand@2.0.0', 'acme')).toEqual({
      scopeId: 'acme',
      name: 'brand',
      version: '2.0.0',
    });
  });

  it.each(['acme/brand/extra', 'acme/', '/brand'])('rejects %p rather than guessing', (ref) => {
    expect(() => parseRef(ref, 'default')).toThrow(/not a theme reference/);
  });
});

/*
 * These all fail before any request is made, so a typo costs no round trip and the message
 * names the file the author actually edited.
 */
describe('publish validation', () => {
  const write = (contents: string) => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'theme-')), 'theme.yaml');
    fs.writeFileSync(file, contents);

    return file;
  };

  const args = (file: string) => ({ file, registry: 'http://localhost:1', scopeId: 'default' });

  it('reports a file that is not there', async () => {
    await expect(publish(args('/nope/missing.yaml'))).rejects.toThrow(/not found/i);
  });

  it('rejects the wrong kind', async () => {
    const file = write('apiVersion: v1\nkind: Application\nname: brand\n');

    await expect(publish(args(file))).rejects.toThrow(/kind must be 'Theme'/);
  });

  it('requires a name', async () => {
    const file = write('apiVersion: v1\nkind: Theme\nspec:\n  version: 1.0.0\n');

    await expect(publish(args(file))).rejects.toThrow(/name is required/);
  });

  it('requires a version, since a theme is addressed by one', async () => {
    const file = write('apiVersion: v1\nkind: Theme\nname: brand\nspec: {}\n');

    await expect(publish(args(file))).rejects.toThrow(/spec.version is required/);
  });

  // Both modes or neither: a theme with only one is half a theme, and the registry would
  // reject it anyway — better to say so before the round trip.
  it('requires both modes', async () => {
    const file = write(
      'apiVersion: v1\nkind: Theme\nname: brand\nspec:\n  version: 1.0.0\n  tokens:\n    light: {}\n',
    );

    await expect(publish(args(file))).rejects.toThrow(/both a light and a dark map/);
  });
});
