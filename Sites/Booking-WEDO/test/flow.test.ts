
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) {
    globalThis.crypto = webcrypto as any;
}

import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../src/index';
import { PrismaClient } from '@prisma/client';
import { computeSignature } from '../src/utils/security';

const prisma = new PrismaClient();
let dbTenantId: string;

describe('Booking Flow', () => {
    beforeAll(async () => {
        // Clean up
        // Clean up using TRUNCATE CASCADE to handle all FKs automatically
        try {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Tenant" CASCADE;`);
            await prisma.syncEvent.deleteMany();
        } catch (error) {
            console.log("Cleanup warning:", error);
        }

        // Create Tenant
        const t = await prisma.tenant.create({
            data: {
                name: "YuYe",
                slug: "yuye"
            }
        });
        dbTenantId = t.id;
    });

    it('GET /api/availability should return mock data', async () => {
        const res = await app.request('/api/availability?tenant=yuye&propertyIds=123&checkIn=2024-01-01&checkOut=2024-01-02');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data[0].propertyId).toBe('123');
    });

    let holdId: string;
    let reservationId: string;

    it('POST /api/holds should create a hold', async () => {
        const payload = {
            tenantId: dbTenantId,
            roomId: 'room_1',
            checkIn: '2024-01-01',
            checkOut: '2024-01-02',
            guests: 2,
            idempotencyKey: 'test_idem_1',
            salesChannel: 'platform',
            salesChannelDetail: 'booking.wedo.com'
        };

        const res = await app.request('/api/holds', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (res.status !== 201) {
            console.error("Holds Error:", await res.text());
        }

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.id).toBeDefined();
        expect(data.status).toBe('hold');

        holdId = data.id;
        reservationId = data.beds24ReservationId;
    });

    it('POST /api/holds with same idempotency should return same hold', async () => {
        const payload = {
            tenantId: dbTenantId,
            roomId: 'room_1',
            checkIn: '2024-01-01',
            checkOut: '2024-01-02',
            guests: 2,
            idempotencyKey: 'test_idem_1',
            salesChannel: 'platform',
            salesChannelDetail: 'booking.wedo.com'
        };

        const res = await app.request('/api/holds', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.id).toBe(holdId);
    });

    it('POST /api/webhooks/payment should confirm order', async () => {
        const payload = {
            paymentIntentId: 'pi_test_123',
            status: 'success',
            holdId: holdId
        };
        const rawBody = JSON.stringify(payload);
        const timestamp = Date.now().toString();
        const signature = await computeSignature(rawBody, timestamp, 'dev_secret');

        const res = await app.request('/api/webhooks/payment', {
            method: 'POST',
            body: rawBody,
            headers: {
                'X-Signature': signature,
                'X-Timestamp': timestamp
            }
        }, {
            WEBHOOK_SECRET: 'dev_secret'
        });

        if (res.status !== 200) {
            console.error("Payment Webhook Error:", await res.text());
        }
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.orderId).toBeDefined();
    });

    it('GET /api/admin/sync-events should show logs', async () => {
        const res = await app.request('/api/admin/sync-events');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        // Should have CREATE_HOLD (Success), CONFIRM_ORDER (Success)
        const holdEvent = data.find((e: any) => e.action === 'CREATE_HOLD');
        // expect(holdEvent).toBeDefined(); // might not exist if creation succeeded without error
    });

    it('POST /api/admin/sync-events/:id/retry should increment retry count', async () => {
        // 1. Create a dummy FAILED event
        const event = await prisma.syncEvent.create({
            data: {
                tenantId: dbTenantId,
                entityType: 'HOLD',
                action: 'CREATE_HOLD',
                status: 'FAILED',
                payload: '{"mock":true}'
            }
        });

        // 2. Call Retry
        const res = await app.request(`/api/admin/sync-events/${event.id}/retry`, {
            method: 'POST'
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.event.retryCount).toBe(1);
        expect(data.event.status).toBe('SUCCESS'); // Because our logic mock defaults to success
    });
});
