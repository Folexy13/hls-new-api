import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Hash password for all test accounts
  const hashedPassword = await bcrypt.hash('Password123@', 10);

  // Create test accounts for each role
  const testAccounts = [
    {
      email: 'principal@demo.com',
      firstName: 'Principal',
      lastName: 'Demo',
      role: Role.principal,
    },
    {
      email: 'wholesaler@demo.com',
      firstName: 'Wholesaler',
      lastName: 'Demo',
      role: Role.wholesaler,
    },
    {
      email: 'benfek@demo.com',
      firstName: 'Benfek',
      lastName: 'Demo',
      role: Role.benfek,
    },
    {
      email: 'researcher@demo.com',
      firstName: 'Researcher',
      lastName: 'Demo',
      role: Role.researcher,
    },
    {
      email: 'pharmacy@demo.com',
      firstName: 'Pharmacy',
      lastName: 'Demo',
      role: Role.pharmacy,
    },
  ];

  for (const account of testAccounts) {
    const existingUser = await prisma.user.findUnique({
      where: { email: account.email },
    });

    if (existingUser) {
      console.log(`⏭️  User ${account.email} already exists, skipping...`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: account.email,
        password: hashedPassword,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
      },
    });

    console.log(`✅ Created ${account.role} account: ${account.email}`);

    // Create wallet for the user
    await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 0,
      },
    });
    console.log(`   💰 Created wallet for ${account.email}`);
  }

  // Create some sample supplements for the wholesaler
  const wholesaler = await prisma.user.findUnique({
    where: { email: 'wholesaler@demo.com' },
  });

  if (wholesaler) {
    const existingSupplements = await prisma.supplement.findMany({
      where: { userId: wholesaler.id },
    });

    if (existingSupplements.length === 0) {
      const supplements = [
        {
          name: 'Vitamin D3 5000 IU',
          description: 'High-potency Vitamin D3 supplement for immune support and bone health. Essential for calcium absorption.',
          price: 5500,
          stock: 100,
          category: 'Vitamins',
          imageUrl: 'https://placehold.co/400x400/6E59A5/FFFFFF?text=Vitamin+D3',
        },
        {
          name: 'Omega-3 Fish Oil',
          description: 'Premium fish oil supplement rich in EPA and DHA. Supports heart, brain, and joint health.',
          price: 8500,
          stock: 75,
          category: 'Essential Fatty Acids',
          imageUrl: 'https://placehold.co/400x400/6E59A5/FFFFFF?text=Omega-3',
        },
        {
          name: 'Magnesium Glycinate',
          description: 'Highly absorbable magnesium for muscle relaxation, sleep support, and stress relief.',
          price: 6000,
          stock: 120,
          category: 'Minerals',
          imageUrl: 'https://placehold.co/400x400/6E59A5/FFFFFF?text=Magnesium',
        },
        {
          name: 'Probiotics 50 Billion CFU',
          description: 'Multi-strain probiotic for gut health, digestion, and immune function.',
          price: 12000,
          stock: 50,
          category: 'Probiotics',
          imageUrl: 'https://placehold.co/400x400/6E59A5/FFFFFF?text=Probiotics',
        },
        {
          name: 'Zinc Picolinate 50mg',
          description: 'Highly bioavailable zinc for immune support, skin health, and hormone balance.',
          price: 4500,
          stock: 150,
          category: 'Minerals',
          imageUrl: 'https://placehold.co/400x400/6E59A5/FFFFFF?text=Zinc',
        },
        {
          name: 'Vitamin B Complex',
          description: 'Complete B vitamin formula for energy, metabolism, and nervous system support.',
          price: 5000,
          stock: 90,
          category: 'Vitamins',
          imageUrl: 'https://placehold.co/400x400/6E59A5/FFFFFF?text=B+Complex',
        },
        {
          name: 'Vitamin C 1000mg',
          description: 'High-dose Vitamin C with bioflavonoids for immune support and antioxidant protection.',
          price: 3500,
          stock: 200,
          category: 'Vitamins',
          imageUrl: 'https://placehold.co/400x400/6E59A5/FFFFFF?text=Vitamin+C',
        },
        {
          name: 'CoQ10 200mg',
          description: 'Coenzyme Q10 for cellular energy production, heart health, and antioxidant support.',
          price: 15000,
          stock: 40,
          category: 'Antioxidants',
          imageUrl: 'https://placehold.co/400x400/6E59A5/FFFFFF?text=CoQ10',
        },
        {
          name: 'Iron Bisglycinate',
          description: 'Gentle, non-constipating iron supplement for energy and blood health.',
          price: 4000,
          stock: 80,
          category: 'Minerals',
          imageUrl: 'https://placehold.co/400x400/6E59A5/FFFFFF?text=Iron',
        },
        {
          name: 'Ashwagandha Root Extract',
          description: 'Adaptogenic herb for stress relief, energy, and hormonal balance.',
          price: 7500,
          stock: 60,
          category: 'Herbs',
          imageUrl: 'https://placehold.co/400x400/6E59A5/FFFFFF?text=Ashwagandha',
        },
      ];

      for (const supplement of supplements) {
        await prisma.supplement.create({
          data: {
            ...supplement,
            userId: wholesaler.id,
          },
        });
      }
      console.log(`\n📦 Created ${supplements.length} sample supplements for wholesaler`);
    } else {
      console.log(`\n⏭️  Supplements already exist, skipping...`);
    }
  }

  // Create a sample quiz code for the principal
  const principal = await prisma.user.findUnique({
    where: { email: 'principal@demo.com' },
  });

  if (principal) {
    const existingQuizCode = await prisma.quizCode.findFirst({
      where: { createdBy: principal.id },
    });

    if (!existingQuizCode) {
      await prisma.quizCode.create({
        data: {
          code: 'DEMO123',
          createdBy: principal.id,
          benfekName: 'Test Benfek',
          benfekPhone: '+2348012345678',
          allergies: 'None',
          scares: 'None',
          familyCondition: 'None',
          medications: 'None',
          hasCurrentCondition: false,
          isUsed: false,
        },
      });
      console.log(`\n🎫 Created sample quiz code: DEMO123 for principal`);
    } else {
      console.log(`\n⏭️  Quiz code already exists, skipping...`);
    }
  }

  console.log('\n✨ Database seeding completed!\n');
  console.log('📋 Test Accounts Created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('| Role       | Email                | Password       |');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('| Principal  | principal@demo.com   | Password123@   |');
  console.log('| Wholesaler | wholesaler@demo.com  | Password123@   |');
  console.log('| Benfek     | benfek@demo.com      | Password123@   |');
  console.log('| Researcher | researcher@demo.com  | Password123@   |');
  console.log('| Pharmacy   | pharmacy@demo.com    | Password123@   |');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🎫 Sample Quiz Code: DEMO123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
