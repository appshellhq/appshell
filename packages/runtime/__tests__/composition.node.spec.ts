/**
 * @jest-environment node
 *
 * Separate from composition.spec.ts because a file gets one environment, and the
 * absence of `window` is the thing under test here rather than an obstacle to it.
 */
import { getBasePath, getRemotes } from '../src/composition';
import { MissingCompositionError } from '../src/errors';

describe('the composition outside a browser', () => {
  it('throws the error that says why, not a ReferenceError', () => {
    expect(typeof window).toBe('undefined');
    expect(() => getRemotes()).toThrow(MissingCompositionError);
    expect(() => getBasePath()).toThrow(MissingCompositionError);
  });
});
