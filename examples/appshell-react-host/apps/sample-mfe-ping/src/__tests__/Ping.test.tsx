import { AppshellRemote, RemoteProvider } from '@appshell/react';
import { render, screen } from '@testing-library/react';
import pkg from '../../package.json';
import Ping from '../Ping';
import manifest from './test.manifest.json';

// The badge shows this package's own version, which CI moves on every release, so the
// snapshot holds a placeholder and the version is asserted on its own below.
expect.addSnapshotSerializer({
  test: (value) => value instanceof Text && value.data === pkg.version,
  serialize: () => '<version>',
});

const renderPing = () =>
  render(
    <RemoteProvider remote={manifest.remotes['PingModule/Ping'] as AppshellRemote}>
      <Ping />
    </RemoteProvider>,
  );

test('should match snapshot', async () => {
  const { container } = renderPing();
  expect(container).toMatchSnapshot();
});

test('should display the remote entry URL in the manifest viewer', () => {
  renderPing();
  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
  expect(textarea.value).toContain('PingModule');
  expect(textarea.value).toContain('./Ping');
});

test('should render the package name', () => {
  const { container } = renderPing();
  expect(container.textContent).toContain('sample-mfe-ping');
});

test('should render the package version', () => {
  renderPing();
  expect(screen.getByText(`v${pkg.version}`)).toBeTruthy();
});
