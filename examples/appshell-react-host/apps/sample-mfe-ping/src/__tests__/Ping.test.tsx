import { RemoteProvider } from '@appshell/react';
import { render, screen } from '@testing-library/react';
import Ping from '../Ping';
import manifest from './test.manifest.json';

const renderPing = () =>
  render(
    <RemoteProvider remote={manifest.remotes['PingModule/Ping']}>
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
