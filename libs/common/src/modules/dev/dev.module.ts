import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';

/**
 * Development-only module for testing utilities
 * 
 * Usage in app.module.ts:
 * ```typescript
 * import { DevModule } from '@moviebooking/common';
 * 
 * const devModules = process.env.NODE_ENV !== 'production' ? [DevModule] : [];
 * 
 * @Module({
 *   imports: [...devModules],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  controllers: [DevController],
})
export class DevModule {}
