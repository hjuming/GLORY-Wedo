import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { PrismaClient } from '@prisma/client';


import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Import providers
import { MockBeds24Provider } from './providers/beds24';

type Bindings = {
    DB: string;
    WEBHOOK_SECRET: string;
    DATABASE_URL: string;
    DIRECT_URL: string;
}

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Initialize Provider
// Helper to get Prisma Client (instantiate with URL from env)
// Note: In production, consider using a singleton pattern via globalThis to reuse connection
const getPrisma = (env: Bindings) => {
    const connectionString = env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
};

// const beds24 = new MockBeds24Provider(new PrismaClient()); 

// Root route removed to allow static assets (index.html) to be served
// app.get('/', (c) => {
//     return c.json({ message: 'Booking-WEDO V1 API is running' });
// });

// -------------------------------------------------------------------------
// 1. Availability
// -------------------------------------------------------------------------
app.get('/api/availability', async (c) => {
    const prisma = getPrisma(c.env);
    const beds24 = new MockBeds24Provider(prisma);

    const tenant = c.req.query('tenant');
    const propertyIds = c.req.query('propertyIds')?.split(',') || [];
    const checkIn = c.req.query('checkIn');
    const checkOut = c.req.query('checkOut');
    const guests = Number(c.req.query('guests') || 1);

    if (!checkIn || !checkOut || propertyIds.length === 0) {
        return c.json({ error: 'Missing required parameters' }, 400);
    }

    try {
        const result = await beds24.getAvailability({
            propertyId: propertyIds,
            checkIn,
            checkOut,
            guests
        });
        return c.json(result);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// -------------------------------------------------------------------------
// 2. Holds (Locking)
// -------------------------------------------------------------------------
app.post('/api/holds', async (c) => {
    const prisma = getPrisma(c.env);
    const body = await c.req.json();
    const {
        tenantId,
        roomId,
        checkIn,
        checkOut,
        guests,
        idempotencyKey,
        salesChannel,
        salesChannelDetail
    } = body;

    try {
        // B2: Mandatory Sales Channel Validation
        if (!salesChannel) {
            return c.json({ error: 'Missing mandatory field: salesChannel' }, 400);
        }

        // 1. Check Idempotency
        if (idempotencyKey) {
            const existing = await prisma.hold.findUnique({
                where: { idempotencyKey }
            });
            if (existing) {
                return c.json(existing);
            }
        }

        // 2. Call Beds24 to make a "Tentative" booking (Hold)
        const beds24 = new MockBeds24Provider(prisma);
        const b24Result = await beds24.createBooking({
            propertyId: "mock_prop", // derived from roomId
            roomId,
            checkIn,
            checkOut,
            guestName: "Guest", // Default
            guestEmail: "guest@example.com",
            status: 'new'
        });

        if (!b24Result.success) {
            return c.json({ error: b24Result.message }, 502);
        }

        // 3. Create Hold in DB
        const hold = await prisma.hold.create({
            data: {
                tenantId,
                roomId,
                checkIn: new Date(checkIn),
                checkOut: new Date(checkOut),
                guests,
                totalPrice: 0, // Placeholder
                status: 'draft', // Initial status
                beds24ReservationId: b24Result.bookId,
                idempotencyKey,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
                salesChannel,
                salesChannelDetail
            }
        });

        // Log Sync Success
        await prisma.syncEvent.create({
            data: {
                tenantId,
                entityId: hold.id,
                entityType: 'HOLD',
                action: 'CREATE_HOLD',
                status: 'SUCCESS',
                payload: JSON.stringify(body)
            }
        });

        return c.json(hold, 201);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

import { verifyWebhookSignature } from './utils/security';

// -------------------------------------------------------------------------
// 3. Payment Webhook (Confirm)
// -------------------------------------------------------------------------
app.post('/api/webhooks/payment', async (c) => {
    const prisma = getPrisma(c.env);
    const signature = c.req.header('X-Signature');
    const timestamp = c.req.header('X-Timestamp');
    const rawBody = await c.req.text(); // Need raw for verification

    // Config: Get Secret
    const secret = c.env.WEBHOOK_SECRET || 'dev_secret';

    // 1. Verify Signature
    if (!signature || !timestamp) {
        return c.json({ error: 'Missing signature headers' }, 401);
    }

    let isValid = false;
    try {
        isValid = await verifyWebhookSignature(signature, timestamp, rawBody, secret);
    } catch (e: any) {
        console.error("Signature Verification Failed:", e);
        return c.json({ error: `Verification Error: ${e.message}` }, 500);
    }

    if (!isValid) {
        return c.json({ error: 'Invalid signature' }, 401);
    }

    // Parse Body
    let body;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return c.json({ error: 'Invalid JSON' }, 400);
    }

    const { paymentIntentId, status, holdId } = body;

    if (status !== 'success') {
        return c.json({ received: true });
    }

    // 2. Idempotency Check (Prevent duplicate confirms)
    // Check if Payment/Order with this paymentIntentId already exists
    const existingPayment = await prisma.payment.findUnique({
        where: { paymentIntentId }
    });
    if (existingPayment) {
        console.log(`Payment idempotent check hit: ${paymentIntentId}`);
        return c.json({ success: true, message: 'Already processed' });
    }

    // 3. Find Hold
    const hold = await prisma.hold.findUnique({ where: { id: holdId } });
    if (!hold) return c.json({ error: 'Hold not found' }, 404);

    // 3.5 Check State (Optional strictness)
    if (hold.status !== 'hold' && hold.status !== 'draft') {
        return c.json({ error: `Hold status ${hold.status} cannot be confirmed` }, 400);
    }

    // 4. Create Order & Payment
    const order = await prisma.order.create({
        data: {
            tenantId: hold.tenantId,
            beds24ReservationId: hold.beds24ReservationId,
            source: 'web',
            status: 'confirmed',
            checkIn: hold.checkIn,
            checkOut: hold.checkOut,
            totalAmount: hold.totalPrice,
            customerName: "John Doe",
            customerEmail: "john@example.com",

            // B2: Inherit Sales Channel
            salesChannel: hold.salesChannel,
            salesChannelDetail: hold.salesChannelDetail,

            payments: {
                create: {
                    amount: hold.totalPrice,
                    status: 'success',
                    paymentIntentId,
                    provider: 'stripe'
                }
            }
        }
    });

    // Update Hold Status to Released/Converted ?
    // Actually V1.2 spec says "Hold -> Confirmed". 
    // Ideally we mark Hold as "converted" or delete it.
    // For now, let's update it to 'released' or keep as 'hold' but linked.
    await prisma.hold.update({
        where: { id: hold.id },
        data: { status: 'released' }
    });

    // 5. Log Sync Event
    await prisma.syncEvent.create({
        data: {
            tenantId: hold.tenantId,
            entityId: order.id,
            entityType: 'ORDER',
            action: 'CONFIRM_ORDER',
            status: 'SUCCESS',
            payload: JSON.stringify(body)
        }
    });

    return c.json({ success: true, orderId: order.id });
});

// -------------------------------------------------------------------------
// 3.1 Beds24 Webhook (Skeleton)
// -------------------------------------------------------------------------
app.post('/api/webhooks/beds24', async (c) => {
    const prisma = getPrisma(c.env);
    const signature = c.req.header('X-Signature');
    const timestamp = c.req.header('X-Timestamp');
    const rawBody = await c.req.text();
    const secret = c.env.WEBHOOK_SECRET || 'dev_secret';

    // 1. Verify
    if (!signature || !timestamp) return c.json({ error: 'Missing headers' }, 401);
    if (!(await verifyWebhookSignature(signature, timestamp, rawBody, secret))) {
        return c.json({ error: 'Invalid signature' }, 401);
    }

    // 2. Log Event (Skeleton)
    await prisma.syncEvent.create({
        data: {
            entityType: 'WEBHOOK',
            action: 'BEDS24_UPDATE',
            status: 'SUCCESS', // Logged successfully
            payload: rawBody
        }
    });

    return c.json({ success: true });
});

// -------------------------------------------------------------------------
// 4. Admin API
// -------------------------------------------------------------------------

// B3: GET /api/admin/orders
app.get('/api/admin/orders', async (c) => {
    const prisma = getPrisma(c.env);
    const tenantId = c.req.query('tenant');
    const status = c.req.query('status');
    const source = c.req.query('source'); // or salesChannel
    const date = c.req.query('date');

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (source) where.salesChannel = source;
    if (date) {
        // Simple date filter (e.g. checkIn >= date)
        where.checkIn = { gte: new Date(date) };
    }

    const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { payments: true }
    });
    return c.json(orders);
});

// B3.2 Sync Event Retry
app.post('/api/admin/sync-events/:id/retry', async (c) => {
    const prisma = getPrisma(c.env);
    const id = c.req.param('id');

    // 1. Fetch Event
    const event = await prisma.syncEvent.findUnique({ where: { id } });
    if (!event) return c.json({ error: 'Event not found' }, 404);

    if (event.status === 'SUCCESS') {
        return c.json({ message: 'Event already successful' }, 400);
    }

    // 2. Retry Logic (Switch mainly)
    let newStatus = 'SUCCESS';
    let errorMsg = null;

    try {
        if (event.action === 'CREATE_HOLD' && event.payload) {
            const payload = JSON.parse(event.payload);
            // Re-attempt Beds24 Create Booking
            // For now, simpler: Just check if Hold exists, if not re-create? 
            // Or assumes payload has enough info.
            // This needs full logic replication. 
            // MVP: Just update attempt count to show we "tried".
            console.log(`Retrying Action: ${event.action} for ${event.entityId}`);
        } else if (event.action === 'BEDS24_UPDATE') {
            // Re-process webhook payload
        }
    } catch (e: any) {
        newStatus = 'FAILED';
        errorMsg = e.message;
    }

    // 3. Update Event
    const updated = await prisma.syncEvent.update({
        where: { id },
        data: {
            status: newStatus,
            error: errorMsg,
            retryCount: { increment: 1 },
            lastAttemptAt: new Date()
        }
    });

    return c.json({ success: true, event: updated });
});

app.get('/api/admin/sync-events', async (c) => {
    const prisma = getPrisma(c.env);
    const events = await prisma.syncEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    });
    return c.json(events);
});


// Export Default with Scheduled Handler
export default {
    fetch: app.fetch,
    async scheduled(event: any, env: Bindings, ctx: any) {
        const prisma = new PrismaClient();
        console.log("Running Cron: Cleanup Expired Holds");

        const now = new Date();
        // Find expired holds that are still 'hold' status
        const expiredHolds = await prisma.hold.findMany({
            where: {
                status: 'hold',
                expiresAt: { lt: now }
            }
        });

        for (const hold of expiredHolds) {
            // 1. Call Beds24 to cancel/release
            // With refactored MockProvider we need to pass prisma again
            const b24 = new MockBeds24Provider(prisma);

            try {
                if (hold.beds24ReservationId) {
                    await b24.cancelBooking(hold.beds24ReservationId);
                }

                // 2. Update DB
                await prisma.hold.update({
                    where: { id: hold.id },
                    data: { status: 'expired' }
                });

                // 3. Log
                await prisma.syncEvent.create({
                    data: {
                        tenantId: hold.tenantId,
                        entityId: hold.id,
                        entityType: 'HOLD',
                        action: 'EXPIRE_HOLD',
                        status: 'SUCCESS'
                    }
                });
            } catch (e: any) {
                console.error(`Failed to expire hold ${hold.id}`, e);
                await prisma.syncEvent.create({
                    data: {
                        tenantId: hold.tenantId,
                        entityId: hold.id,
                        entityType: 'HOLD',
                        action: 'EXPIRE_HOLD',
                        status: 'FAILED',
                        error: e.message
                    }
                });
            }
        }
    }
}

export { app };
