// public/assets/ui.js

export const ui = {
    $(id) {
        return document.getElementById(id);
    },

    renderListings(items, containerId = 'listing-grid') {
        const container = this.$(containerId);
        if (!container) return;

        container.innerHTML = items.map(item => `
            <article class="listing-card" data-tenant="${item.tenant}" data-slug="${item.slug}">
                <a class="cover" href="${item.href}">
                    <img src="${item.coverImage}" alt="${item.coverAlt}" loading="lazy" />
                </a>
                <div class="body">
                    <div class="title-row">
                        <h3>${item.name}</h3>
                        <span class="tag">${item.type}</span>
                    </div>
                    <p class="title-zh">${item.nameZh}</p>
                    <p class="address">${item.address}</p>
                    <div class="tags-row">
                        ${item.tags.map(t => `<span class="pill-sm">${t}</span>`).join('')}
                    </div>
                    <div class="actions">
                        <a class="btn btn-primary" href="${item.href}#availability">查看房況</a>
                        <a class="btn btn-link" href="${item.href}">房源介紹</a>
                    </div>
                </div>
            </article>
        `).join('');
    },

    renderPropertyHero(property) {
        const hero = this.$('property-hero');
        if (!hero) return;
        // Simple hero with first image, or slider later
        // For MVP, just background image or simple img tag
        const bgParams = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('${property.heroImages[0]}')`;
        hero.style.backgroundImage = bgParams;
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';

        // H1 and Subtitle if inside hero
        const titleEl = hero.querySelector('h1');
        if (titleEl) titleEl.textContent = property.nameZh;
    },

    renderPropertyContent(property) {
        // Highlights
        const hlContainer = this.$('highlights-grid');
        if (hlContainer && property.highlights) {
            hlContainer.innerHTML = property.highlights.map(h => `
                <div class="highlight-card"><p>${h}</p></div>
            `).join('');
        }

        // Info
        if (this.$('info-address')) this.$('info-address').textContent = property.address;
        if (this.$('info-checkin')) this.$('info-checkin').textContent = property.checkIn;
        if (this.$('info-checkout')) this.$('info-checkout').textContent = property.checkOut;
        if (this.$('info-eco')) this.$('info-eco').textContent = property.ecoNote;

        // Intro
        if (this.$('property-intro')) this.$('property-intro').innerText = property.intro;

        // Pet Policy
        const petContainer = this.$('pet-policy-content');
        if (petContainer && property.petPolicy) {
            petContainer.innerHTML = `
                <p><strong>費用：</strong>${property.petPolicy.fee}</p>
                <p><strong>限制：</strong>${property.petPolicy.limit}</p>
                <ul>
                    ${property.petPolicy.rules.map(r => `<li>${r}</li>`).join('')}
                </ul>
                <p class="note">${property.petPolicy.note}</p>
            `;
        }

        // Room Types (Static Display)
        const roomContainer = this.$('room-types-grid');
        if (roomContainer && property.roomTypes) {
            roomContainer.innerHTML = property.roomTypes.map(room => `
                <div class="room-card">
                    <h4>${room.name}</h4>
                    <p><strong>床型：</strong>${room.beds}</p>
                    <p><strong>人數：</strong>${room.capacity}</p>
                    <p class="note">${room.note}</p>
                </div>
            `).join('');
        }
    },

    renderAvailabilityResults(results, containerId = 'availability-results') {
        const container = this.$(containerId);
        if (!container) return;

        if (!results.success || results.data.length === 0) {
            container.innerHTML = '<p>查無資料。</p>';
            return;
        }

        // Flatten rooms from all properties (usually just 1 here)
        const allRooms = results.data.flatMap(d => d.rooms);

        container.innerHTML = allRooms.map(room => `
            <div class="result-card">
                <div class="info">
                    <h4>${room.name}</h4>
                    <span class="price">NT$ ${room.price} / 晚</span>
                    <span class="qty">剩餘 ${room.available} 間</span>
                </div>
                <button 
                    class="btn btn-primary" 
                    ${room.available === 0 ? 'disabled' : ''}
                    onclick="window.app.initiateHold('${room.roomId}', ${room.price})"
                >
                    ${room.available === 0 ? '已售完' : '立即預訂'}
                </button>
            </div>
        `).join('');
    },

    showSection(id) {
        document.querySelectorAll('section.step-section').forEach(el => el.classList.add('hidden'));
        const el = this.$(id);
        if (el) el.classList.remove('hidden');
    }
};
