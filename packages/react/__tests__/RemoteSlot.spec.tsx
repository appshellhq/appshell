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

    let rendered!: ReturnType<typeof render>;
    // Async, so act waits for the load's own microtasks: the state it sets lands inside act.
    await act(async () => {
      rendered = render(<RemoteSlot remote="TestModule/TestComponent" />);
    });
    const { container, findByText } = rendered;
    const view = await findByText(/test component/i);

    expect(view).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render fallback while resource is pending', async () => {
    jest.spyOn(remoteLoader, 'default').mockReturnValueOnce(() => [null, null]);

    // Async, so act waits for the load's own microtasks: the state it sets lands inside act.
    await act(async () => {
      render(<RemoteSlot remote="TestModule/TestComponent" fallback={<TestFallback />} />);
    });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render error when resource fails', async () => {
    jest
      .spyOn(remoteLoader, 'default')
      .mockImplementationOnce(() => new Error('Failed to get resource'));

    // Async, so act waits for the load's own microtasks: the state it sets lands inside act.
    await act(async () => {
      render(<RemoteSlot remote="TestModule/TestComponent" fallback={<TestFallback />} />);
    });

    expect(screen.getByText(/Error loading Appshell component/i)).toBeInTheDocument();
  });
});
