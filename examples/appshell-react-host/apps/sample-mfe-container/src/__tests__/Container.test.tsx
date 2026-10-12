import { act, render, screen } from '@testing-library/react';
import pkg from '../../package.json';
import Container from '../Container';

// Vars carry configuration, not appearance — colour reaches this package through the
// Application's design tokens instead.
jest.mock('../env', () => ({
  SUPPORT_URL: 'https://support.example.com',
}));

// The badge shows this package's own version, which CI moves on every release, so the
// snapshot holds a placeholder and the version is asserted on its own below.
expect.addSnapshotSerializer({
  test: (value) => value instanceof Text && value.data === pkg.version,
  serialize: () => '<version>',
});

const renderContainer = () => act(() => render(<Container />));

test('should match snapshot', async () => {
  const { container } = await renderContainer();
  expect(container).toMatchSnapshot();
});

test('should render micro-frontend composition message', async () => {
  await renderContainer();
  expect(screen.getByText('This application is composed from 3 micro-frontends.')).toBeTruthy();
});

test('should render links to React, Appshell and Webpack', async () => {
  await renderContainer();
  // Three external links exist: React, Appshell (from vars), Webpack
  const links = screen.getAllByRole('link');
  expect(links).toHaveLength(3);
  expect(links[0].getAttribute('href')).toBe('https://reactjs.org');
  expect(links[1].getAttribute('href')).toBe('https://support.example.com');
  expect(links[2].getAttribute('href')).toBe('https://webpack.js.org/');
});

test('should render the package version', async () => {
  await renderContainer();
  expect(screen.getByText(`v${pkg.version}`)).toBeTruthy();
});
