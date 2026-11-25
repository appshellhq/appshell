import { restoreCommand, shellQuote } from '../restoreHint';

describe('shellQuote', () => {
  it('leaves an argument a shell passes through unchanged as it is', () => {
    expect(shellQuote('https://registry.appshell.org')).toBe('https://registry.appshell.org');
    expect(shellQuote('1.2.0-alpha.3')).toBe('1.2.0-alpha.3');
  });

  it('single-quotes anything else, and the quotes inside it', () => {
    expect(shellQuote('http://localhost:7150/a b')).toBe(`'http://localhost:7150/a b'`);
    expect(shellQuote(`it's`)).toBe(`'it'\\''s'`);
    expect(shellQuote('$(rm -rf ~)')).toBe(`'$(rm -rf ~)'`);
  });
});

/* Copilot on appshellhq/appshell#37: a hint that leaves out the registry restores elsewhere. */
describe('restoreCommand', () => {
  it('names the scope and the registry, so it works copied from anywhere', () => {
    expect(
      restoreCommand({
        name: 'checkout',
        version: '1.2.0',
        scopeId: 'acme',
        registry: 'https://other.example',
      }),
    ).toBe('appshell restore checkout 1.2.0 --defaultScope acme --registry https://other.example');
  });
});
