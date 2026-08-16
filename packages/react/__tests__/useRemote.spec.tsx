/** @jest-environment jsdom */
import { AppshellRemote } from '@appshell/config';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { RemoteProvider } from '../src/contexts/RemoteContext';
import useRemote from '../src/hooks/useRemote';

const remote: AppshellRemote = {
  id: 'ping',
  scope: 'PingModule',
  module: './Ping',
  manifestUrl: 'http://test.com/appshell.manifest.json',
  remoteEntryUrl: 'http://test.com/remoteEntry.js',
  metadata: { title: 'Ping' },
};

const Probe = () => <span>{useRemote()?.remoteEntryUrl ?? 'none'}</span>;

describe('useRemote', () => {
  it('returns the remote backing the surrounding component', () => {
    render(
      <RemoteProvider remote={remote}>
        <Probe />
      </RemoteProvider>,
    );

    expect(screen.getByText(remote.remoteEntryUrl)).toBeInTheDocument();
  });

  it('returns undefined outside a provider, so hosts render standalone', () => {
    render(<Probe />);

    expect(screen.getByText('none')).toBeInTheDocument();
  });
});
