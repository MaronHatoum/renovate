import { mocked, partial } from '../../../../test/util';
import * as _repositoryCache from '../repository';
import type { BranchCache, RepoCacheData } from '../repository/types';
import { getCachedConflictResult, setCachedConflictResult } from './conflict';

jest.mock('../repository');
const repositoryCache = mocked(_repositoryCache);

describe('util/cache/branch/conflict', () => {
  let repoCache: RepoCacheData = {};

  beforeEach(() => {
    repoCache = {};
    repositoryCache.getCache.mockReturnValue(repoCache);
  });

  describe('getCachedConflictResult', () => {
    it('returns null if cache is not populated', () => {
      expect(
        getCachedConflictResult('foo', 'sha', 'bar', 'base_sha')
      ).toBeNull();
    });

    it('returns null if branch cache not found', () => {
      repoCache.branches = [
        partial<BranchCache>({
          branchName: 'foo',
          sha: 'sha',
          baseBranch: 'bar',
          baseBranchSha: 'base_sha',
          isConflicted: true,
        }),
      ];
      expect(
        getCachedConflictResult('not_foo', 'sha', 'bar', 'base_sha')
      ).toBeNull();
    });

    it('returns null if base branch SHA has changed', () => {
      repoCache.branches = [
        partial<BranchCache>({
          branchName: 'foo',
          sha: 'sha',
          baseBranch: 'bar',
          baseBranchSha: 'base_sha',
          isConflicted: true,
        }),
      ];
      expect(
        getCachedConflictResult('foo', 'sha', 'bar', 'not_base_sha')
      ).toBeNull();
    });

    it('returns null if branch SHA has changed', () => {
      repoCache.branches = [
        partial<BranchCache>({
          branchName: 'foo',
          sha: 'sha',
          baseBranch: 'bar',
          baseBranchSha: 'base_sha',
          isConflicted: true,
        }),
      ];
      expect(
        getCachedConflictResult('foo', 'not_sha', 'bar', 'base_sha')
      ).toBeNull();
    });

    it('returns null if isConfliced is undefined', () => {
      repoCache.branches = [
        partial<BranchCache>({
          branchName: 'foo',
          sha: 'sha',
          baseBranch: 'bar',
          baseBranchSha: 'base_sha',
        }),
      ];
      expect(
        getCachedConflictResult('foo', 'sha', 'bar', 'base_sha')
      ).toBeNull();
    });

    it('returns true', () => {
      repoCache.branches = [
        partial<BranchCache>({
          branchName: 'foo',
          sha: 'sha',
          baseBranch: 'bar',
          baseBranchSha: 'base_sha',
          isConflicted: true,
        }),
      ];
      expect(
        getCachedConflictResult('foo', 'sha', 'bar', 'base_sha')
      ).toBeTrue();
    });

    it('deletes old cache', () => {
      repoCache.gitConflicts = {
        foo: {
          targetBranchSha: '111',
          sourceBranches: {
            bar: { sourceBranchSha: '222', isConflicted: true },
          },
        },
      };
      getCachedConflictResult('foo', '111', 'bar', '222');
      expect(repoCache.gitConflicts).toBeUndefined();
    });
  });

  describe('setCachedConflictResult', () => {
    it('return without updating value for unpopulated cache', () => {
      setCachedConflictResult('foo', false);
      expect(repoCache).toEqual({});
    });

    it('updates value', () => {
      repoCache.branches = [
        partial<BranchCache>({
          branchName: 'foo',
          sha: 'sha',
          baseBranch: 'bar',
          baseBranchSha: 'base_sha',
          isConflicted: true,
        }),
      ];
      setCachedConflictResult('foo', false);
      expect(repoCache).toEqual({
        branches: [
          {
            branchName: 'foo',
            sha: 'sha',
            baseBranch: 'bar',
            baseBranchSha: 'base_sha',
            isConflicted: false,
          },
        ],
      });
    });

    it('handles multiple branches', () => {
      repoCache.branches = [
        partial<BranchCache>({
          branchName: 'foo-1',
          sha: 'sha',
          baseBranch: 'bar',
          baseBranchSha: 'base_sha',
          isConflicted: true,
        }),
        partial<BranchCache>({
          branchName: 'foo-2',
          sha: 'sha',
          baseBranch: 'bar',
          baseBranchSha: 'base_sha',
          isConflicted: false,
        }),
      ];
      setCachedConflictResult('foo-1', false);
      setCachedConflictResult('foo-2', true);
      expect(repoCache).toEqual({
        branches: [
          {
            branchName: 'foo-1',
            sha: 'sha',
            baseBranch: 'bar',
            baseBranchSha: 'base_sha',
            isConflicted: false,
          },
          {
            branchName: 'foo-2',
            sha: 'sha',
            baseBranch: 'bar',
            baseBranchSha: 'base_sha',
            isConflicted: true,
          },
        ],
      });
    });
  });
});
