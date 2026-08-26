import fs from 'fs';
import { fetchPackageSpec } from '../src/util/fetch';

jest.mock('fs');

describe('cli util', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('fetchPackageSpec', () => {
    it('should throw if package.json not found', async () => {
      const workingDir = 'does/not/exist';
      jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

      await expect(() => fetchPackageSpec(workingDir)).rejects.toThrowError(
        `Package spec not found at ${workingDir}/package.json`,
      );
    });
  });
});
