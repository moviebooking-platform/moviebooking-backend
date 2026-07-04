// Injection token for the shared ioredis client. Kept in its own file so the
// module and the services that use it don't form a circular import.
export const REDIS_CLIENT = 'REDIS_CLIENT';
