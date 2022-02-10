import { gte, lt, lte, satisfies } from '@renovatebot/pep440';
import { parse as parseRange } from '@renovatebot/pep440/lib/specifier.js';
import { parse as parseVersion } from '@renovatebot/pep440/lib/version.js';
import { logger } from '../../logger';
import { regEx } from '../../util/regex';
import type { NewValueConfig } from '../types';

function getFutureVersion(
  baseVersion: string,
  newVersion: string,
  step: number
): string {
  const toRelease: number[] = parseVersion(newVersion)?.release ?? [];
  const baseRelease: number[] = parseVersion(baseVersion)?.release ?? [];
  let found = false;
  const futureRelease = baseRelease.map((basePart, index) => {
    if (found) {
      return 0;
    }
    const toPart = toRelease[index] || 0;
    if (toPart > basePart) {
      found = true;
      return toPart + step;
    }
    return toPart;
  });
  if (!found) {
    futureRelease[futureRelease.length - 1] += step;
  }
  if (futureRelease[0] === toRelease[0] && futureRelease[1] < toRelease[1]) {
    futureRelease[1] = toRelease[1];
  }
  return futureRelease.join('.');
}

interface Range {
  operator: string;
  prefix: string;
  version: string;
}

export function getNewValue({
  currentValue,
  rangeStrategy,
  currentVersion,
  newVersion,
}: NewValueConfig): string | null {
  // easy pin
  if (rangeStrategy === 'pin') {
    return '==' + newVersion;
  }
  if (currentValue === currentVersion) {
    return newVersion;
  }
  const ranges: Range[] = parseRange(currentValue);
  if (!ranges) {
    logger.warn({ currentValue }, 'Invalid pep440 currentValue');
    return null;
  }
  if (!ranges.length) {
    // an empty string is an allowed value for PEP440 range
    // it means get any version
    logger.warn('Empty currentValue: ' + currentValue);
    return currentValue;
  }
  if (rangeStrategy === 'auto' || rangeStrategy === 'replace') {
    if (satisfies(newVersion, currentValue)) {
      return currentValue;
    }
  }
  if (!['replace', 'bump'].includes(rangeStrategy)) {
    logger.debug(
      'Unsupported rangeStrategy: ' +
        rangeStrategy +
        '. Using "replace" instead.'
    );
    return getNewValue({
      currentValue,
      rangeStrategy: 'replace',
      currentVersion,
      newVersion,
    });
  }
  if (ranges.some((range) => range.operator === '===')) {
    // the operator "===" is used for legacy non PEP440 versions
    logger.warn(
      { currentValue },
      'PEP440 arbitrary equality (===) not supported'
    );
    return null;
  }
  let result = ranges
    .map((range) => {
      // used to exclude versions,
      // we assume that's for a good reason
      if (range.operator === '!=') {
        return range.operator + range.version;
      }

      // used to mark minimum supported version
      if (['>', '>='].includes(range.operator)) {
        if (lte(newVersion, range.version)) {
          // this looks like a rollback
          return '>=' + newVersion;
        }
        // this is similar to ~=
        if (rangeStrategy === 'bump' && range.operator === '>=') {
          return range.operator + newVersion;
        }
        // otherwise treat it same as exclude
        return range.operator + range.version;
      }

      // this is used to exclude future versions
      if (range.operator === '<') {
        // if newVersion is that future version
        if (gte(newVersion, range.version)) {
          // now here things get tricky
          // we calculate the new future version
          const futureVersion = getFutureVersion(range.version, newVersion, 1);
          return range.operator + futureVersion;
        }
        // otherwise treat it same as exclude
        return range.operator + range.version;
      }

      // keep the .* suffix
      if (range.prefix) {
        const futureVersion = getFutureVersion(range.version, newVersion, 0);
        return range.operator + futureVersion + '.*';
      }

      if (['==', '~=', '<='].includes(range.operator)) {
        return range.operator + newVersion;
      }

      // unless PEP440 changes, this won't happen
      // istanbul ignore next
      logger.error(
        { newVersion, currentValue, range },
        'pep440: failed to process range'
      );
      // istanbul ignore next
      return null;
    })
    .filter(Boolean)
    .join(', ');

  if (result.includes(', ') && !currentValue.includes(', ')) {
    result = result.replace(regEx(/, /g), ',');
  }
  const checkedResult = checkRangeAndRemoveUnnecessaryRangeLimit(result);
  if (!satisfies(newVersion, checkedResult)) {
    // we failed at creating the range
    logger.warn(
      { result, newVersion, currentValue },
      'pep440: failed to calculate newValue'
    );
    return null;
  }
  if (checkedResult) {
    return checkedResult;
  }
  return result;
}

/*this function checks if contains 2 ranges with operator '==' and '>='
  if yes the function will compare the 2 ranges and if one ranges contains the second range
  the function will exclude the unnecessary range.*/
export function checkRangeAndRemoveUnnecessaryRangeLimit(
  rangeInput: string
): string {
  let firstRangePart;
  let secondRangePart;
  let futureRelease;
  let found = false;
  if (rangeInput.includes(',')) {
    const newRes = rangeInput.split(',');
    if (newRes[0].includes('==') || newRes[0].includes('>=')) {
      firstRangePart = parseRange(newRes[0]);
    }
    if (newRes[1].includes('==') || newRes[1].includes('>=')) {
      secondRangePart = parseRange(newRes[1]);
    }
    if (firstRangePart === undefined || secondRangePart === undefined) {
      return rangeInput;
    }
    if (firstRangePart) {
      const first: number[] =
        parseVersion(firstRangePart[0].version)?.release ?? [];
      const second: number[] =
        parseVersion(secondRangePart[0].version)?.release ?? [];
      futureRelease = first.map((basePart, index) => {
        const toPart = second[index];
        if (found) {
          return basePart;
        }
        if (toPart < basePart) {
          found = true;
          return basePart;
        }
        return toPart;
      });
    }
  }
  if (futureRelease) {
    if (futureRelease.length === 2) {
      return firstRangePart[0].operator.concat(futureRelease.join('.'), '.*');
    } else {
      return firstRangePart[0].operator.concat(futureRelease.join('.'));
    }
  }
  return rangeInput;
}

export function isLessThanRange(input: string, range: string): boolean {
  try {
    let invertResult = true;

    const results = range
      .split(',')
      .map((x) =>
        x
          .replace(regEx(/\s*/g), '')
          .split(regEx(/(~=|==|!=|<=|>=|<|>|===)/))
          .slice(1)
      )
      .map(([op, version]) => {
        if (['!=', '<=', '<'].includes(op)) {
          return true;
        }
        invertResult = false;
        if (['~=', '==', '>=', '==='].includes(op)) {
          return lt(input, version);
        }
        if (op === '>') {
          return lte(input, version);
        }
        // istanbul ignore next
        return false;
      });

    const result = results.every((res) => res === true);

    return invertResult ? !result : result;
  } catch (err) /* istanbul ignore next */ {
    return false;
  }
}
