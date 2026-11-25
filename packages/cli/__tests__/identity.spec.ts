import fs from 'fs';
import os from 'os';
import path from 'path';
import { identify } from '../src/util/identity';

/*
 * Scope used to be stripped here and taken from whoever ran the command, so the same
 * repository published to different namespaces depending on who published it, and nothing
 * checked in recorded where its packages belonged.
 */
describe('identify', () => {
  let dir: string;

  const withPackage = (name: string, version = '1.2.3') => {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, version }));

    return dir;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appshell-identity-'));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('reads the scope a package name declares', () => {
    expect(identify(withPackage('@acme/checkout'))).toMatchObject({
      scopeId: 'acme',
      name: 'checkout',
    });
  });

  /* An unscoped package belongs wherever the publisher does, as it always did. */
  it('reports no scope when the name declares none', () => {
    expect(identify(withPackage('checkout')).scopeId).toBeUndefined();
  });

  it('keeps the version alongside it', () => {
    expect(identify(withPackage('@acme/checkout', '4.5.6')).version).toBe('4.5.6');
  });

  /*
   * An explicit name names the package outright, so there is no manifest to read a
   * declared scope from and it falls back to the publisher's own.
   */
  it('reports no scope when the name was given explicitly', () => {
    expect(identify(withPackage('@acme/checkout'), 'other', '9.9.9').scopeId).toBeUndefined();
  });
});
