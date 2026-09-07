/* eslint-disable no-underscore-dangle, @typescript-eslint/naming-convention */
import { render } from '@testing-library/react';
import { Viewer } from '../index';

/**
 * Sets what the registry inlines into the document, which is where `getIdentity`
 * reads from. Using the real accessor rather than mocking it: the thing worth
 * testing is that a package handles both branches, and a mock would let a
 * component that only handles one still pass.
 */
const inlined = (value: unknown) => {
  (window as unknown as Record<string, unknown>).__appshell_identity__ = value;
};

describe('Viewer', () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__appshell_identity__;
  });

  it('names the signed-in visitor and their roles', () => {
    inlined({ authenticated: true, subject: 'a1b2', username: 'rh', roles: ['publisher'] });

    const { container } = render(<Viewer />);

    expect(container.textContent).toContain('rh');
    expect(container.textContent).toContain('publisher');
  });

  it('says so when an authenticated visitor has no roles, rather than rendering a gap', () => {
    inlined({ authenticated: true, subject: 'a1b2', username: 'rh', roles: [] });

    expect(render(<Viewer />).container.textContent).toContain('no roles');
  });

  it('renders the anonymous state as a real state, not an empty one', () => {
    inlined({ authenticated: false });

    const { container } = render(<Viewer />);

    expect(container.textContent).toContain('anonymous');
    expect(container.textContent).toContain('not signed in');
  });

  it('is anonymous when the registry inlined nothing at all', () => {
    expect(render(<Viewer />).container.textContent).toContain('anonymous');
  });

  it('never renders the subject, which is an internal id rather than a display name', () => {
    inlined({ authenticated: true, subject: 'a1b2', username: 'rh', roles: [] });

    expect(render(<Viewer />).container.textContent).not.toContain('a1b2');
  });
});
