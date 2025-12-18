import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        console.log("Attempting to connect to DB...");
        const count = await prisma.tenant.count();
        console.log("Tenants count:", count);
    } catch (e) {
        console.error("Prisma Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
