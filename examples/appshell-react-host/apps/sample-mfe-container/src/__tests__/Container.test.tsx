import { act, render, screen } from '@testing-library/react';
import React from 'react';
import Container from '../Container';

jest.mock('../env', () => ({
  BACKGROUND_COLOR: 'red',
}));

const renderContainer = () =>
  act(() =>
    render(<Container />),
  );

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
  // Three external links exist: React, Appshell, Webpack
  const links = screen.getAllByRole('link');
  expect(links).toHaveLength(3);
  expect(links[0].getAttribute('href')).toBe('https://reactjs.org');
  expect(links[1].getAttribute('href')).toBe('https://github.com/navaris/appshell');
  expect(links[2].getAttribute('href')).toBe('https://webpack.js.org/');
});
