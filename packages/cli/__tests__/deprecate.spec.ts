import axios from '../src/util/axios';
import { RegistryClient } from '../src/util/registry';

jest.mock('../src/util/axios');
jest.mock('../src/util/credentials', () => ({ ensureToken: jest.fn().mockResolvedValue('t') }));

const request = axios.request as jest.MockedFunction<typeof axios.request>;

/*
 * Lifting a deprecation shipped broken, and nothing here would have caught it: the cli
 * decided `no reason` by truthiness but sent the value regardless, so the bare form put
 * `{reason: ''}` on the wire — a deprecation with nothing to say, which the registry
 * refuses — while labelling its own failure `undeprecate`. Both halves are asserted
 * because the bug was that they disagreed.
 */
describe('deprecatePackage', () => {
  const client = new RegistryClient('https://registry.test');

  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: { id: 'appshell/thing@0.1.1' } } as never);
  });

  const bodyOf = () => (request.mock.calls[0][0] as { data: unknown }).data;

  it('sends the reason when deprecating', async () => {
    await client.deprecatePackage('appshell', 'thing', '0.1.1', 'use 0.1.3 instead');

    expect(bodyOf()).toEqual({ reason: 'use 0.1.3 instead' });
  });

  it('omits the field entirely when lifting, rather than blanking it', async () => {
    await client.deprecatePackage('appshell', 'thing', '0.1.1');

    expect(bodyOf()).toEqual({});
    expect(bodyOf()).not.toHaveProperty('reason');
  });

  it('treats an empty reason as lifting, not as a blank deprecation', async () => {
    await client.deprecatePackage('appshell', 'thing', '0.1.1', '');

    expect(bodyOf()).toEqual({});
  });

  it('names the operation it actually performed when it fails', async () => {
    request.mockRejectedValue(new Error('boom'));

    await expect(client.deprecatePackage('appshell', 'thing', '0.1.1')).rejects.toThrow(
      /Failed to undeprecate appshell\/thing@0\.1\.1/,
    );
    await expect(client.deprecatePackage('appshell', 'thing', '0.1.1', 'why')).rejects.toThrow(
      /Failed to deprecate appshell\/thing@0\.1\.1/,
    );
  });
});
