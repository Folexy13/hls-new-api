import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const newPassword = 'Password123@';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update principal@demo.com password
  const user = await prisma.user.update({
    where: { email: 'principal@demo.com' },
    data: { password: hashedPassword },
  });

  console.log(`✅ Password updated for ${user.email}`);
  console.log(`   New password: ${newPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
