import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
const phoneE164 = process.env.ADMIN_PHONE_E164;

if (!connectionString) throw new Error('DATABASE_URL is required.');
if (!phoneE164 || !/^\+[1-9]\d{7,14}$/.test(phoneE164)) {
  throw new Error('Set ADMIN_PHONE_E164 to the registered admin phone in E.164 format.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { phoneE164 },
    select: { id: true, phoneE164: true, status: true },
  });
  if (!user) {
    throw new Error('No account exists for this phone. Register and verify it first.');
  }
  if (user.status !== 'ACTIVE') {
    throw new Error('The requested account is not active.');
  }

  const role = await prisma.role.findUnique({
    where: { code: 'SUPER_ADMIN' },
    select: { id: true },
  });
  if (!role) throw new Error('SUPER_ADMIN role is missing. Run the seed command first.');

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: user.id, roleId: role.id },
    },
    create: { userId: user.id, roleId: role.id },
    update: {},
  });

  console.info(`Granted SUPER_ADMIN to verified account ${user.phoneE164}.`);
}

main()
  .catch((error: unknown) => {
    console.error('Admin provisioning failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
