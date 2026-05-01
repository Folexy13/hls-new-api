require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const principalsWithoutWallet = await prisma.user.findMany({
    where: {
      role: 'principal',
      wallet: null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { id: 'asc' },
  });

  if (principalsWithoutWallet.length === 0) {
    console.log('No principals are missing wallets.');
    return;
  }

  console.log(`Found ${principalsWithoutWallet.length} principal(s) without wallets.`);

  const created = [];

  for (const principal of principalsWithoutWallet) {
    const wallet = await prisma.wallet.create({
      data: {
        userId: principal.id,
        balance: 0,
      },
    });

    created.push({
      principalId: principal.id,
      email: principal.email,
      name: `${principal.firstName} ${principal.lastName}`.trim(),
      walletId: wallet.id,
    });
  }

  console.log('Created wallets:');
  console.log(JSON.stringify(created, null, 2));
}

main()
  .catch((error) => {
    console.error('Failed to backfill principal wallets.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
