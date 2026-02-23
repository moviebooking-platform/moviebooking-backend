export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  STAFF: 'STAFF',
  THEATRE_ADMIN: 'THEATRE_ADMIN',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const ROLES_KEY = 'roles';
