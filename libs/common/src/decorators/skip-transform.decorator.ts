import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * Decorator to skip the TransformInterceptor.
 * Use on internal/service-to-service endpoints that return raw data.
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
