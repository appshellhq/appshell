import type { AppshellRemote } from '@appshell/react';
import { render, screen } from '@testing-library/react';
import { AppShowcase, PackageBlock, Remote } from '../index';

describe('PackageBlock', () => {
  it('should render name and version', () => {
    const { container } = render(<PackageBlock name="my-package" version="1.2.3" />);
    expect(container.textContent).toContain('my-package');
    expect(container.textContent).toContain('1.2.3');
  });

  it('should match snapshot', () => {
    const { container } = render(<PackageBlock name="test-pkg" version="0.0.1" />);
    expect(container).toMatchSnapshot();
  });
});

describe('AppShowcase', () => {
  it('should render header and children', () => {
    render(
      <AppShowcase header={<span>My Header</span>}>
        <div>Child Content</div>
      </AppShowcase>,
    );
    expect(screen.getByText('My Header')).toBeTruthy();
    expect(screen.getByText('Child Content')).toBeTruthy();
  });

  it('should match snapshot', () => {
    const { container } = render(
      <AppShowcase header="Header Text">
        <p>Body</p>
      </AppShowcase>,
    );
    expect(container).toMatchSnapshot();
  });
});

describe('Remote', () => {
  const remote: AppshellRemote = {
    id: 'abc123',
    manifestUrl: 'http://localhost:3001/appshell.manifest.json',
    remoteEntryUrl: 'http://localhost:3001/remoteEntry.js',
    scope: 'TestModule',
    module: './Test',
    metadata: {
      route: '/test',
      displayName: 'Test MFE',
    },
  };

  it('should render remote JSON as textarea', () => {
    const { container } = render(<Remote remote={remote} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toContain('"scope": "TestModule"');
    expect(textarea?.value).toContain('"module": "./Test"');
  });

  it('should match snapshot', () => {
    const { container } = render(<Remote remote={remote} />);
    expect(container).toMatchSnapshot();
  });
});
