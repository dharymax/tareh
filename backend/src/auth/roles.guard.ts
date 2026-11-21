import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service.js';
import { REQUIRED_ROLES_KEY } from './roles.decorator.js';
import type { AuthenticatedUser } from './current-user.decorator.js';

type AuthenticatedRequest = {
  user?: AuthenticatedUser;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.userId;
    if (!userId) throw new ForbiddenException('صلاحية الدخول مطلوبة');

    const assignment = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { code: { in: requiredRoles } },
      },
      select: { roleId: true },
    });

    if (!assignment) throw new ForbiddenException('ليس لديك صلاحية تنفيذ هذه العملية');
    return true;
  }
}
