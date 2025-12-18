// public/assets/app.js
import { api } from './api.js';
import { ui } from './ui.js';

window.app = {
    state: {
        tenant: 'yuye',
        currentProperty: null,
        hold: null // { id, total, ... }
    },

    async init() {
        console.log('App Initializing...');

        // Detect Page Type
        if (document.getElementById('zone-xiaoliuqiu')) {
            // Landing Page
            await this.initLanding();
        } else if (document.getElementById('property-hero')) {
            // Property Page
            await this.initProperty();
        }
    },

    async initLanding() {
        try {
            const res = await fetch('/data/listings.json');
            const data = await res.json();
            ui.renderListings(data.items);
        } catch (e) {
            console.error('Failed to load listings', e);
        }
    },

    async initProperty() {
        // 1. Load Data
        try {
            // Determine property slug from URL or hardcode for MVP if path structure matches
            // Path: /l/yuye-shanyin/
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            const slug = pathParts[pathParts.length - 1] === 'index.html' ? pathParts[pathParts.length - 2] : pathParts[pathParts.length - 1];

            // Map slug to json file? For MVP, we know it's yuye.json or we fetch from /data/properties/${slug}.json
            // Let's try dynamic fetch
            const res = await fetch(`/data/properties/yuye.json`); // Hardcoded for this specific MVP file as per user spec
            const data = await res.json();

            this.state.currentProperty = data;

            ui.renderPropertyHero(data);
            ui.renderPropertyContent(data);

            // 2. Setup Booking Flow Listeners
            this.setupBookingFlow();

        } catch (e) {
            console.error('Failed to load property data', e);
        }
    },

    setupBookingFlow() {
        // Search Button
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.checkAvailability());
        }

        // Mock Pay Button
        const payBtn = document.getElementById('pay-btn');
        if (payBtn) {
            payBtn.addEventListener('click', () => this.mockPay());
        }
    },

    async checkAvailability() {
        const checkIn = document.getElementById('checkIn').value;
        const checkOut = document.getElementById('checkOut').value;
        const guests = document.getElementById('guests').value || 2;

        if (!checkIn || !checkOut) {
            alert('請選擇日期');
            return;
        }

        ui.showSection('property-availability'); // Ensure we are looking at availability section
        const container = document.getElementById('availability-results');
        container.innerHTML = '<p>查詢中...</p>';

        try {
            // Use API
            // slug from state
            const slug = this.state.currentProperty.slug;
            const res = await api.getAvailability(this.state.tenant, slug, checkIn, checkOut, guests);

            ui.renderAvailabilityResults(res);
        } catch (e) {
            container.innerHTML = `<p class="error">查詢失敗: ${e.message}</p>`;
        }
    },

    async initiateHold(roomId, price) {
        // User clicked "Book Now"
        const checkIn = document.getElementById('checkIn').value;
        const checkOut = document.getElementById('checkOut').value;
        const guests = document.getElementById('guests').value || 2;

        try {
            const holdData = {
                tenantId: this.state.tenant,
                roomId, // Note: Backend mock uses roomId to derive property, currently "mock_prop" internally or based on input lookup
                checkIn,
                checkOut,
                guests: Number(guests),
                salesChannel: 'platform',
                salesChannelDetail: 'booking-wedo-mvp',
                idempotencyKey: crypto.randomUUID()
            };

            const hold = await api.createHold(holdData);
            this.state.hold = hold;

            // Transition to Checkout View
            this.showCheckout(hold);

        } catch (e) {
            alert('無法建立預訂: ' + e.message);
        }
    },

    showCheckout(hold) {
        // Hide standard sections, show checkout
        document.getElementById('property-main').classList.add('hidden');
        document.getElementById('step-checkout').classList.remove('hidden');

        // Update Checkout UI
        document.getElementById('hold-info').innerHTML = `
            <h3>預訂明細</h3>
            <p><strong>入住日期：</strong>${new Date(hold.checkIn).toLocaleDateString()} - ${new Date(hold.checkOut).toLocaleDateString()}</p>
            <p><strong>保留時限：</strong>15 分鐘</p>
            <p class="total">總金額：NT$ ${hold.totalPrice || '1,500'}</p> 
        `; // Note: Backend returns 0 for now as placeholder, using fallback or we can pass price from frontend for display if needed
    },

    async mockPay() {
        if (!this.state.hold) return;
        const btn = document.getElementById('pay-btn');
        btn.disabled = true;
        btn.innerText = '處理中...';

        try {
            // Mock Payment Intent
            const paymentIntentId = `pi_${Date.now()}`;

            await api.confirmPayment(this.state.hold.id, paymentIntentId);

            // Show Success
            document.getElementById('step-checkout').classList.add('hidden');
            document.getElementById('step-success').classList.remove('hidden');

        } catch (e) {
            alert('付款失敗: ' + e.message);
            btn.disabled = false;
            btn.innerText = '模擬付款';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
