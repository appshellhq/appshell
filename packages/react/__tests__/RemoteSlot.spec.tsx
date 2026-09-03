/** @jest-environment jsdom */
import * as remoteLoader from '@appshell/loader';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import RemoteSlot from '../src/components/RemoteSlot';
import manifest from './fixtures/Manifest';
import TestComponent from './fixtures/TestComponent';

const TestFallback = () => <div>loading...</div>;

describe('RemoteSlot', () => {
  it('should match snapshot', async () => {
    jest
      .spyOn(remoteLoader, 'default')
      .mockReturnValueOnce(async () => [
        TestComponent,
        manifest.remotes['TestModule/TestComponent'],
      ]);

    const { container, findByText } = await act(() =>
      render(<RemoteSlot remote="TestModule/TestComponent" />),
    );
    const view = await findByText(/test component/i);

    expect(view).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render fallback while resource is pending', async () => {
    jest.spyOn(remoteLoader, 'default').mockReturnValueOnce(() => [null, null]);

    await act(() =>
      render(<RemoteSlot remote="TestModule/TestComponent" fallback={<TestFallback />} />),
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render error when resource fails', async () => {
    jest
      .spyOn(remoteLoader, 'default')
      .mockImplementationOnce(() => new Error('Failed to get resource'));

    await act(() =>
      render(<RemoteSlot remote="TestModule/TestComponent" fallback={<TestFallback />} />),
    );

    expect(screen.getByText(/Error loading Appshell component/i)).toBeInTheDocument();
  });
});
