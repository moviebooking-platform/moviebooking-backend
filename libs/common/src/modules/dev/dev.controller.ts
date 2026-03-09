import { Controller, Get, Param, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { encryptId, decryptId, isIdCipherEnabled } from '../../utils/id-cipher.util';

/**
 * Development-only endpoints for testing ID encryption.
 * Protected by DevModule conditional import (non-production only)
 * an additional runtime environment: assertNonProduction Method check as defense in depth.
 */
@ApiTags('dev')
@Controller('dev')
export class DevController {
  private assertNonProduction(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev endpoints are disabled in production');
    }
  }
  @Get('encrypt/:id')
  @ApiOperation({ 
    summary: '[DEV ONLY] Encrypt an ID', 
    description: 'Encrypts a numeric ID to obfuscated string.' 
  })
  @ApiParam({ name: 'id', type: Number, description: 'Numeric ID to encrypt' })
  @ApiResponse({ status: 200, description: 'Encrypted ID returned' })
  encrypt(@Param('id') id: string) {
    this.assertNonProduction();
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return { error: 'Invalid ID - must be a number' };
    }
    return {
      original: numericId,
      encrypted: encryptId(numericId),
      cipherEnabled: isIdCipherEnabled(),
    };
  }

  @Get('decrypt/:encryptedId')
  @ApiOperation({ 
    summary: '[DEV ONLY] Decrypt an ID', 
    description: 'Decrypts an obfuscated string back to numeric ID.' 
  })
  @ApiParam({ name: 'encryptedId', type: String, description: 'Encrypted ID string to decrypt' })
  @ApiResponse({ status: 200, description: 'Decrypted ID returned' })
  decrypt(@Param('encryptedId') encryptedId: string) {
    this.assertNonProduction();
    const decrypted = decryptId(encryptedId);
    return {
      encrypted: encryptedId,
      decrypted,
      valid: decrypted !== null,
      cipherEnabled: isIdCipherEnabled(),
    };
  }

  @Get('status')
  @ApiOperation({ 
    summary: '[DEV ONLY] Check cipher status', 
    description: 'Check if ID encryption is enabled' 
  })
  @ApiResponse({ status: 200, description: 'Cipher status returned' })
  status() {
    this.assertNonProduction();
    return {
      cipherEnabled: isIdCipherEnabled(),
      message: isIdCipherEnabled() 
        ? 'ID encryption is enabled' 
        : 'ID encryption is disabled (ID_ENCRYPTION_KEY not set)',
    };
  }
}
