/* Place cards shared by Saved, Map and Planner, plus "add to trip" sheet */
import { $, esc, prettyDate } from '../utils.js';
import { PLACE_CATEGORIES, placeById } from '../data/places.js';
import * as store from '../store.js';
import { openSheet } from './sheet.js';
import { openReviewSheet } from './review-sheet.js';
import { toast } from './toast.js';
import { stars } from './stars.js';

export function placeCard(p, { compact = false } = {}) {
    const saved = store.isSaved(p.id);
    const cat = PLACE_CATEGORIES[p.category];
    const review = store.getReview('place', p.id);
    return `
        <article class="place-card ${compact ? 'compact' : ''}" data-place="${esc(p.id)}">
            <div class="place-thumb" aria-hidden="true">${esc(p.emoji)}</div>
            <div class="place-main">
                <div class="place-name">${esc(p.name)}</div>
                <div class="place-meta">${cat.emoji} ${cat.label} · ${esc(p.area)}${compact ? '' : `, ${esc(p.city)}`}</div>
                <div class="place-rating">${stars(p.rating, { size: 'sm' })}<span>${p.rating.toFixed(1)}</span>${review ? `<span class="mine">· You: ${review.rating}★</span>` : ''}</div>
                ${compact ? '' : `
                <p class="place-blurb">${esc(p.blurb)}</p>
                <div class="place-actions">
                    <button class="chip-btn" data-act="add-trip">＋ Add to trip</button>
                    <button class="chip-btn" data-act="review">${review ? '✏️ Edit review' : '✍️ Review'}</button>
                    <button class="chip-btn" data-act="map">📍 Map</button>
                </div>`}
            </div>
            <button class="heart ${saved ? 'on' : ''}" data-act="heart" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save place'}">${saved ? '♥' : '♡'}</button>
        </article>
    `;
}

// 事件委派：一個容器內所有地點卡片的按鈕
// 愛心預設只更新該張卡片；需要整頁重繪的頁面（Saved）傳入 onChange
export function wirePlaceList(root, { onChange } = {}) {
    if (!root) return;
    root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        const card = e.target.closest('[data-place]');
        if (!btn || !card) return;
        const p = placeById(card.dataset.place);
        if (!p) return;
        const act = btn.dataset.act;
        if (act === 'heart') {
            const on = store.toggleSavedPlace(p.id);
            toast(on ? `Saved ${p.name}` : `Removed ${p.name}`);
            if (onChange) onChange();
            else card.outerHTML = placeCard(p, { compact: card.classList.contains('compact') });
        } else if (act === 'add-trip') {
            openAddToTripSheet(p);
        } else if (act === 'review') {
            openReviewSheet('place', p.id);
        } else if (act === 'map') {
            location.hash = '#/map?q=' + encodeURIComponent(`${p.name}, ${p.city}`);
        }
    });
}

export function openAddToTripSheet(place) {
    const trips = store.trips()
        .filter(t => store.tripStatus(t) === 'upcoming')
        .sort((a, b) => a.start.localeCompare(b.start));
    openSheet({
        title: `Add ${place.name}`,
        body: trips.length ? `
            <p class="sheet-text">Choose a trip. Trips in ${esc(place.city)} are listed first.</p>
            <div class="pick-list">
                ${trips.sort((a, b) => (b.city === place.city) - (a.city === place.city)).map(t => {
                    const has = t.stops.includes(place.id);
                    return `
                        <button class="pick-row" data-trip="${esc(t.id)}" ${has ? 'disabled' : ''}>
                            <span class="pick-emoji">${esc(t.emoji)}</span>
                            <span class="pick-text"><b>${esc(t.city)}</b><small>${prettyDate(t.start)} → ${prettyDate(t.end)}</small></span>
                            <span class="pick-state">${has ? 'Added ✓' : '＋'}</span>
                        </button>`;
                }).join('')}
            </div>
        ` : `
            <p class="sheet-text">You have no upcoming trips yet.</p>
            <a class="btn" href="#/dates">Plan a trip</a>
        `,
        onMount(el, close) {
            el.addEventListener('click', (e) => {
                const row = e.target.closest('[data-trip]');
                if (row) {
                    const t = store.getTrip(row.dataset.trip);
                    store.addStop(t.id, place.id);
                    close();
                    toast(`Added to ${t.city}`);
                }
                if (e.target.closest('a')) close();
            });
        }
    });
}
