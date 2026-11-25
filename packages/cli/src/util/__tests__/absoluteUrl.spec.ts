import { absoluteUrl } from '../registry';

/**
 * The registry returns these relative on a single-host deployment and absolute once
 * the control and serving planes are split, so both forms have to work against the
 * same call site.
 */
describe('absoluteUrl', () => {
  it('resolves a relative url against the registry', () => {
    expect(absoluteUrl('/overlays/abc/confirm', 'https://registry.example.com')).toBe(
      'https://registry.example.com/overlays/abc/confirm',
    );
  });

  it('keeps an absolute url pointing at the serving plane', () => {
    expect(
      absoluteUrl('https://apps.example.com/overlays/abc/confirm', 'https://registry.example.com'),
    ).toBe('https://apps.example.com/overlays/abc/confirm');
  });

  it('does not double a slash when the registry url has a trailing one', () => {
    expect(absoluteUrl('/overlays/abc/confirm', 'https://registry.example.com/')).toBe(
      'https://registry.example.com/overlays/abc/confirm',
    );
  });

  it('keeps a port', () => {
    expect(absoluteUrl('/overlays/abc/confirm', 'http://localhost:7150')).toBe(
      'http://localhost:7150/overlays/abc/confirm',
    );
  });
});
