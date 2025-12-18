// public/assets/api.js

const API_BASE = '/api';

export const api = {
    async getAvailability(tenant, propertyIds, checkIn, checkOut, guests = 2) {
        const params = new URLSearchParams({
            tenant,
            propertyIds: Array.isArray(propertyIds) ? propertyIds.join(',') : propertyIds,
            checkIn,
            checkOut,
            guests
        });
        const res = await fetch(`${API_BASE}/availability?${params}`);
        if (!res.ok) throw new Error((await res.json()).error || 'Check availability failed');
        return await res.json();
    },

    async createHold(data) {
        // data: { tenant, propertyId, roomId, checkIn, checkOut, guests, salesChannel... }
        const res = await fetch(`${API_BASE}/holds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Create hold failed');
        return await res.json();
    },

    async confirmPayment(holdId, paymentIntentId) {
        // Client-side HMAC generation for MVP demo
        // In real app, this happens on backend or payment gateway callback
        // Here we simulate the secure call from client
        const timestamp = Date.now().toString();
        // We use the dev_secret which matches the backend default for this MVP
        const secret = 'dev_secret';

        const body = {
            holdId,
            paymentIntentId,
            status: 'success'
        };
        const rawBody = JSON.stringify(body);

        const signature = await this._computeSignature(rawBody, timestamp, secret);

        const res = await fetch(`${API_BASE}/webhooks/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signature,
                'X-Timestamp': timestamp
            },
            body: rawBody
        });

        if (!res.ok) throw new Error((await res.json()).error || 'Payment confirmation failed');
        return await res.json();
    },

    async _computeSignature(body, timestamp, secret) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const data = encoder.encode(body + timestamp);
        const signature = await crypto.subtle.sign("HMAC", key, data);
        return Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
};
