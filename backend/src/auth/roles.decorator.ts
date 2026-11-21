import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLES_KEY = 'tareh:required-roles';

export const RequireRoles = (...roles: string[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
