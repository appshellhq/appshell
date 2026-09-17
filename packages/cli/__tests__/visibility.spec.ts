import axios from '../src/util/axios';
import { RegistryClient } from '../src/util/registry';

jest.mock('../src/util/axios');
jest.mock('../src/util/credentials', () => ({ ensureToken: jest.fn().mockResolvedValue('t') }));

const request = axios.request as jest.MockedFunction<typeof axios.request>;

/*
 * `publish --visibility private` on an already-published version printed `Already
 * published` and changed nothing: visibility is not part of a package's digest, so the
 * publish matched on content and returned a no-op. This is the command that does it, and
 * the assertions are about the address — a version in the path would be the same defect
 * in a new place, since visibility belongs to the package and every version follows.
 */
describe('setPackageVisibility', () => {
  const client = new RegistryClient('https://registry.test');

  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({
      data: { scopeId: 'appshell', name: 'thing', visibility: 'private', versions: 3 },
    } as never);
  });

  const sent = () => request.mock.calls[0][0] as { url: string; method: string; data: unknown };

  it('should address the package, with no version in the path', async () => {
    await client.setPackageVisibility('appshell', 'thing', 'private');

    expect(sent().url).toBe('https://registry.test/v1/packages/appshell/thing/visibility');
  });

  it('should patch rather than republish', async () => {
    await client.setPackageVisibility('appshell', 'thing', 'private');

    expect(sent().method).toBe('patch');
  });

  it.each(['public', 'private'] as const)('should send %s as asked', async (visibility) => {
    await client.setPackageVisibility('appshell', 'thing', visibility);

    // Stated outright rather than toggled: a caller that does not say what it wants
    // cannot be told whether it got it.
    expect(sent().data).toEqual({ visibility });
  });

  it('should report how many versions were reclassified', async () => {
    const result = await client.setPackageVisibility('appshell', 'thing', 'private');

    expect(result.versions).toBe(3);
  });
});
