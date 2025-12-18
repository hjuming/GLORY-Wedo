import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // 1. Create Tenant (idempotent: use upsert)
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'yuye' },
        update: {},
        create: {
            name: 'YuYe ShanYin',
            slug: 'yuye'
        }
    });

    console.log(`Tenant seeded: ${tenant.slug}`);

    // 2. Create Properties
    const propertiesData = [
        { name: 'YuYe Main', beds24ById: '123456' },
        { name: 'YuYe Annex', beds24ById: '123457' },
        { name: 'YuYe Villa', beds24ById: '123458' }
    ];

    for (const p of propertiesData) {
        // Only create if not exists
        const existing = await prisma.property.findFirst({
            where: { tenantId: tenant.id, beds24PropId: p.beds24ById }
        });

        if (!existing) {
            await prisma.property.create({
                data: {
                    tenantId: tenant.id,
                    name: p.name,
                    beds24PropId: p.beds24ById
                }
            });
        }
    }

    console.log("Properties seeded.");
    console.log("Seeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
