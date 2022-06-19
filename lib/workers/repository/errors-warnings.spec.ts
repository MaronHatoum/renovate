import { RenovateConfig, getConfig } from '../../../test/util';
import type { PackageFile } from '../../modules/manager/types';
import {
  getDepWarningsDashboard,
  getDepWarningsPR,
  getErrors,
  getWarnings,
} from './errors-warnings';

describe('workers/repository/errors-warnings', () => {
  describe('getWarnings()', () => {
    let config: RenovateConfig;

    beforeEach(() => {
      jest.resetAllMocks();
      config = getConfig();
    });

    it('returns warning text', () => {
      config.warnings = [
        {
          topic: 'foo',
          message: 'Failed to look up dependency',
        },
      ];
      const res = getWarnings(config);
      expect(res).toMatchInlineSnapshot(`
        "
        # Warnings (1)

        Please correct - or verify that you can safely ignore - these warnings before you merge this PR.

        -   \`foo\`: Failed to look up dependency

        ---
        "
      `);
    });

    it('getWarning returns empty string', () => {
      config.warnings = [];
      const res = getWarnings(config);
      expect(res).toMatchInlineSnapshot(`""`);
    });
  });

  describe('getDepWarningsPR()', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('returns pr warning text', () => {
      const packageFiles: Record<string, PackageFile[]> = {
        npm: [
          {
            packageFile: 'package.json',
            deps: [
              {
                warnings: [{ message: 'Warning 1', topic: undefined }],
              },
              {},
            ],
          },
          {
            packageFile: 'backend/package.json',
            deps: [
              {
                warnings: [{ message: 'Warning 1', topic: undefined }],
              },
            ],
          },
        ],
        dockerfile: [
          {
            packageFile: 'Dockerfile',
            deps: [
              {
                warnings: [{ message: 'Warning 2', topic: undefined }],
              },
            ],
          },
        ],
      };
      const res = getDepWarningsPR(packageFiles);
      expect(res).toMatchInlineSnapshot(`
        "
        ---

        ### ⚠ Dependency Lookup Warnings ⚠

        Please correct - or verify that you can safely ignore - these lookup failures before you merge this PR.

        -   \`Warning 1\`
        -   \`Warning 2\`

        Files affected: \`package.json\`, \`backend/package.json\`, \`Dockerfile\`

        "
      `);
    });

    it('PR warning returns empty string', () => {
      const packageFiles: Record<string, PackageFile[]> = null;
      const res = getDepWarningsPR(packageFiles);
      expect(res).toMatchInlineSnapshot(`""`);
    });
  });

  describe('getDepWarningsDashboard()', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('returns dashboard warning text', () => {
      const packageFiles: Record<string, PackageFile[]> = {
        npm: [
          {
            packageFile: 'package.json',
            deps: [
              {
                warnings: [{ message: 'Warning 1', topic: undefined }],
              },
              {},
            ],
          },
          {
            packageFile: 'backend/package.json',
            deps: [
              {
                warnings: [{ message: 'Warning 1', topic: undefined }],
              },
            ],
          },
        ],
        dockerfile: [
          {
            packageFile: 'Dockerfile',
            deps: [
              {
                warnings: [{ message: 'Warning 2', topic: undefined }],
              },
            ],
          },
        ],
      };
      const res = getDepWarningsDashboard(packageFiles);
      expect(res).toMatchInlineSnapshot(`
        "
        ---

        ### ⚠ Dependency Lookup Warnings ⚠

        -   \`Warning 1\`
        -   \`Warning 2\`

        Files affected: \`package.json\`, \`backend/package.json\`, \`Dockerfile\`

        "
      `);
    });

    it('dashboard warning returns empty string', () => {
      const packageFiles: Record<string, PackageFile[]> = null;
      const res = getDepWarningsDashboard(packageFiles);
      expect(res).toMatchInlineSnapshot(`""`);
    });
  });

  describe('getErrors()', () => {
    let config: RenovateConfig;

    beforeEach(() => {
      jest.resetAllMocks();
      config = getConfig();
    });

    it('returns error text', () => {
      config.errors = [
        {
          topic: 'renovate.json',
          message: 'Failed to parse',
        },
      ];
      const res = getErrors(config);
      expect(res).toMatchInlineSnapshot(`
        "
        # Errors (1)

        Renovate has found errors that you should fix (in this branch) before finishing this PR.

        -   \`renovate.json\`: Failed to parse

        ---
        "
      `);
    });

    it('getError returns empty string', () => {
      config.errors = [];
      const res = getErrors(config);
      expect(res).toMatchInlineSnapshot(`""`);
    });
  });
});
