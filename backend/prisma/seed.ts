import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: { code: 'SUPER_ADMIN', name: 'Super Administrator' },
  });
  await prisma.role.upsert({
    where: { code: 'SPORTS_MANAGER' },
    update: {},
    create: { code: 'SPORTS_MANAGER', name: 'Sports Manager' },
  });
  await prisma.role.upsert({
    where: { code: 'CONTENT_MANAGER' },
    update: {},
    create: { code: 'CONTENT_MANAGER', name: 'Content Manager' },
  });
  await prisma.role.upsert({
    where: { code: 'SUPPORT_AGENT' },
    update: {},
    create: { code: 'SUPPORT_AGENT', name: 'Support Agent' },
  });
  await prisma.scoringRule.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      exactScorePoints: 5,
      correctOutcomePoints: 3,
      correctTotalGoalsPoints: 2,
      isActive: true,
    },
  });
  await prisma.country.upsert({
    where: { iso2: 'YE' },
    update: { name: 'Yemen' },
    create: { iso2: 'YE', name: 'Yemen' },
  });
}

main()
  .catch((error: unknown) => {
    console.error('TAREH seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
