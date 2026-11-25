/**
 * @jest-environment node
 *
 * Separate from identity.spec.ts because a file gets one environment, and the
 * absence of `window` is the thing under test here rather than an obstacle to it.
 */
import { ANONYMOUS, getIdentity } from '../src/identity';

describe('getIdentity outside a browser', () => {
  it('is anonymous rather than throwing when there is no window', () => {
    expect(typeof window).toBe('undefined');
    expect(getIdentity()).toEqual(ANONYMOUS);
  });
});
