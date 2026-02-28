import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { decryptId } from '../utils/id-cipher.util';

/**
 * Decorator to decrypt ID from route params
 * Usage: @DecryptId('id') id: number
 */
export const DecryptId = createParamDecorator(
  (paramName: string = 'id', ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    const encryptedId = request.params[paramName];

    if (!encryptedId) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Missing parameter: ${paramName}`,
      });
    }

    const id = decryptId(encryptedId);

    if (id === null) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Invalid ${paramName}`,
      });
    }

    return id;
  },
);
