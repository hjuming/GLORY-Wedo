// Global State
const state = {
    tenant: 'yuye',
    property: '',
    propertyName: '',
    checkIn: '',
    checkOut: '',
    holdId: null,
    totalPrice: 0,
    timer: null,
    secret: 'dev_secret' // Exposed for MVP Demo only
};

// Utils
const $ = (id) => document.getElementById(id);
const uuidv4 = () => crypto.randomUUID();

// Navigation / UI
function openBookingFlow(tenant, property, name) {
    state.tenant = tenant;
    state.property = property;
    state.propertyName = name;

    $('booking-title').innerText = `預訂: ${name}`;
    $('booking-overlay').classList.remove('hidden');
    showStep('availability');

    // Set default dates (Tomorrow -> Day after)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    $('checkIn').valueAsDate = tomorrow;
    $('checkOut').valueAsDate = dayAfter;
}

function closeBookingFlow() {
    $('booking-overlay').classList.add('hidden');
    clearInterval(state.timer);
}

function showStep(stepName) {
    ['availability', 'checkout', 'success'].forEach(s => {
        $(`step-${s}`).classList.add('hidden');
    });
    $(`step-${stepName}`).classList.remove('hidden');
}

// 1. Check Availability
$('availability-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    state.checkIn = $('checkIn').value;
    state.checkOut = $('checkOut').value;

    // Call API
    try {
        const query = new URLSearchParams({
            tenant: state.tenant,
            propertyId: state.property, // Note: API expects propertyId usually, though mock might not care
            checkIn: state.checkIn,
            checkOut: state.checkOut,
            guests: 2
        });

        const res = await fetch(`/api/availability?${query}`);
        const data = await res.json();

        renderResults(data);
    } catch (err) {
        alert('查詢失敗: ' + err.message);
    }
});

function renderResults(data) {
    const container = $('availability-results');
    container.innerHTML = '';

    // Mock rendering if API returns just array or generic object
    // Assuming API v1.1 returns { available: boolean, ... } or mock list
    // For MVP Visuals, we force a "Standard Room" result

    const roomDiv = document.createElement('div');
    roomDiv.className = 'room-result';
    roomDiv.innerHTML = `
        <div class="room-info">
            <h4>標準雙人房</h4>
            <p class="text-xs text-muted">包含早餐・海景</p>
        </div>
        <div class="room-action">
            <div class="room-price">NT$ 3,500 / 晚</div>
            <button class="btn btn-primary btn-sm" onclick="createHold('room_standard_1', 3500)">立即預訂</button>
        </div>
    `;
    container.appendChild(roomDiv);
}

// 2. Create Hold
async function createHold(roomId, price) {
    const idempotencyKey = uuidv4();
    try {
        const res = await fetch('/api/holds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenantId: state.tenant,
                propertyId: state.property,
                roomId: roomId,
                checkIn: new Date(state.checkIn),
                checkOut: new Date(state.checkOut),
                guests: 2,
                totalPrice: price,
                idempotencyKey: idempotencyKey,
                salesChannel: 'platform',
                salesChannelDetail: 'booking-wedo-mvp'
            })
        });

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        state.holdId = data.id;
        state.totalPrice = price;

        // Setup Step 2
        $('checkout-room-name').innerText = `預訂: ${state.propertyName} - 標準雙人房`;
        $('checkout-dates').innerText = `${state.checkIn} ~ ${state.checkOut}`;
        $('checkout-price').innerText = `總金額: NT$ ${price}`;

        showStep('checkout');
        startTimer();

    } catch (err) {
        console.error(err);
        alert('建立保留失敗: ' + err.message);
    }
}

function startTimer() {
    let seconds = 900; // 15 mins
    clearInterval(state.timer);
    state.timer = setInterval(() => {
        seconds--;
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        $('timer').innerText = `${m}:${s}`;
        if (seconds <= 0) {
            clearInterval(state.timer);
            alert('保留時間已過，請重新查詢');
            closeBookingFlow();
        }
    }, 1000);
}

// 3. Mock Payment (with Signature for Module 1)
$('pay-btn').addEventListener('click', async () => {
    $('pay-btn').disabled = true;
    $('pay-btn').innerText = '處理中...';

    try {
        const payload = JSON.stringify({
            holdId: state.holdId,
            paymentIntentId: `pi_${uuidv4()}`, // Mock Stripe ID
            status: 'success'
        });
        const timestamp = Date.now().toString();

        // Client-side Signing (MVP Only)
        const signature = await computeSignature(payload, timestamp, state.secret);

        const res = await fetch('/api/webhooks/payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Actually text/plain needed? No, middleware logic handles raw.
                // But wrapper might need care. Hono `c.req.text()` reads body.
                // Standard fetch sends string body OK.
                'X-Signature': signature,
                'X-Timestamp': timestamp
            },
            body: payload
        });

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();

        // Success
        $('order-details').innerHTML = `
            <p>訂單編號: <strong>${data.orderId.substring(0, 8)}...</strong></p>
            <p>已發送確認信至您的信箱。</p>
        `;
        showStep('success');

    } catch (err) {
        console.error(err);
        $('order-details').innerHTML = `<p style="color:red; font-weight:bold;">付款失敗: ${err.message}</p>`;
        showStep('success'); // Show the error in the success/result container for visibility
        // Or better: keep in checkout but show error? 
        // Let's reuse success container for "Message" to keep it simple for Agent to see.
        $('step-checkout').classList.add('hidden');
        $('step-success').classList.remove('hidden');

        $('pay-btn').disabled = false;
        $('pay-btn').innerText = '模擬付款 (NT$ 100)';
    }
});

// Helper: HMAC-SHA256
async function computeSignature(body, timestamp, secret) {
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
