import { RemoteProvider } from '@appshell/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Pong from '../Pong';
import manifest from './test.manifest.json';

const renderPong = () =>
  render(
    <RemoteProvider remote={manifest.remotes['PongModule/Pong']}>
      <Pong />
    </RemoteProvider>,
  );

test('should match snapshot', async () => {
  const { container } = renderPong();
  expect(container).toMatchSnapshot();
});

test('should display the remote entry URL in the manifest viewer', () => {
  renderPong();
  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
  expect(textarea.value).toContain('PongModule');
  expect(textarea.value).toContain('./Pong');
});

test('should render the package name', () => {
  const { container } = renderPong();
  expect(container.textContent).toContain('sample-mfe-pong');
});
