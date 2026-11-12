import { Injectable, PipeTransform } from '@nestjs/common';
import { throwError } from '@moviebooking/common';

export const MAX_IDS_PER_REQUEST = 500;

/**
 * Parses a comma-separated list of positive integer IDs (e.g. "1,2,3").
 * Rejects empty input, non-integers, zero/negatives and oversized lists with 400.
 * Duplicates are removed.
 */
@Injectable()
export class ParseIdListPipe implements PipeTransform<unknown, number[]> {
  constructor(private readonly paramName = 'ids') {}

  transform(value: unknown): number[] {
    if (typeof value !== 'string' || value.trim() === '') {
      throwError('VALIDATION_ERROR', `${this.paramName} is required`);
    }

    const parts = (value as string).split(',').map((part) => part.trim());

    if (parts.length > MAX_IDS_PER_REQUEST) {
      throwError(
        'VALIDATION_ERROR',
        `${this.paramName} accepts at most ${MAX_IDS_PER_REQUEST} IDs`,
      );
    }

    const ids = parts.map((part) => {
      if (!/^[1-9]\d{0,9}$/.test(part)) {
        throwError(
          'VALIDATION_ERROR',
          `${this.paramName} must be a comma-separated list of positive integers`,
        );
      }
      return Number(part);
    });

    return [...new Set(ids)];
  }
}
