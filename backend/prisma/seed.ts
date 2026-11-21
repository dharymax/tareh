import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed TAREH.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const roles = [
    { code: 'SUPER_ADMIN', name: 'مدير النظام' },
    { code: 'SPORTS_MANAGER', name: 'مدير الرياضة' },
    { code: 'CONTENT_MANAGER', name: 'مدير المحتوى' },
    { code: 'SUPPORT_AGENT', name: 'خدمة المستخدمين' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: role,
    });
  }

  await prisma.scoringRule.upsert({
    where: { version: 1 },
    update: {
      exactScorePoints: 5,
      correctOutcomePoints: 3,
      correctTotalGoalsPoints: 2,
      isActive: true,
    },
    create: {
      version: 1,
      exactScorePoints: 5,
      correctOutcomePoints: 3,
      correctTotalGoalsPoints: 2,
      isActive: true,
    },
  });

  console.info('TAREH reference roles and scoring rule v1 are ready.');
}

main()
  .catch((error: unknown) => {
    console.error('TAREH seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
