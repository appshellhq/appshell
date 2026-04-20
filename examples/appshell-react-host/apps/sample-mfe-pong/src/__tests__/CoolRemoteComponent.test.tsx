import { render, screen } from '@testing-library/react';
import React from 'react';
import CoolRemoteComponent from '../CoolRemoteComponent';

test('should render without crashing', () => {
  const { container } = render(<CoolRemoteComponent />);
  expect(container).toMatchSnapshot();
});

test('should render content', () => {
  render(<CoolRemoteComponent />);
  expect(screen.getByText('1')).toBeTruthy();
});
