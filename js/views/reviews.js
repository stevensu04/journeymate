import { $, esc, prettyDate, dayOf, replaceHash, legal } from '../utils.js';
import * as store from '../store.js';
import { placeById, PLACE_CATEGORIES } from '../data/places.js';
import { openReviewSheet } from '../ui/review-sheet.js';
import { stars } from '../ui/stars.js';

function targetInfo(type, ref) {
    if (type === 'trip') {
        const t = store.getTrip(ref);
        return { emoji: t ? t.emoji : '🧳', name: store.reviewTargetName(type, ref), meta: t ? `Trip · ${prettyDate(t.start)} → ${prettyDate(t.end)}` : 'Trip' };
    }
    const p = placeById(ref);
    return { emoji: p ? p.emoji : '📍', name: store.reviewTargetName(type, ref), meta: p ? `${PLACE_CATEGORIES[p.category].label} · ${p.area}, ${p.city}` : 'Place' };
}

export function reviews(params) {
    const todo = store.reviewTodo();
    const done = [...store.reviews()].sort((a, b) => b.at.localeCompare(a.at));
    const tab = params.tab === 'done' || (params.tab !== 'todo' && !todo.length) ? 'done' : 'todo';
    const avg = done.length ? done.reduce((sum, r) => sum + r.rating, 0) / done.length : 0;
    const left = Math.max(0, store.REVIEW_DAILY_CAP - store.earnedToday('review'));

    const todoHtml = todo.length ? todo.map(item => {
        const info = targetInfo(item.type, item.ref);
        return `
            <article class="review-todo" data-type="${item.type}" data-ref="${esc(item.ref)}">
                <div class="place-thumb" aria-hidden="true">${esc(info.emoji)}</div>
                <div class="place-main">
                    <div class="place-name">${esc(info.name)}</div>
                    <div class="place-meta">${esc(item.type === 'trip' ? info.meta : `From your ${item.trip.city} trip`)}</div>
                </div>
                <button class="chip-btn primary" data-write>Write</button>
            </article>`;
    }).join('') : `
        <div class="empty">
            <div class="empty-icon" aria-hidden="true">🎉</div>
            <p>All caught up! Completed trips and their stops will show up here.</p>
        </div>`;

    const doneHtml = done.length ? done.map(r => {
        const info = targetInfo(r.type, r.ref);
        return `
            <article class="review-card" data-type="${r.type}" data-ref="${esc(r.ref)}">
                <header>
                    <span class="review-emoji" aria-hidden="true">${esc(info.emoji)}</span>
                    <div>
                        <div class="place-name">${esc(info.name)}</div>
                        <div class="place-meta">${esc(info.meta)}</div>
                    </div>
                    <button class="icon-btn light" data-edit aria-label="Edit review">✏️</button>
                </header>
                <div class="review-rating">${stars(r.rating)}<span class="muted small">${prettyDate(dayOf(r.at))}</span></div>
                ${r.tags.length ? `<div class="review-tags">${r.tags.map(t => `<span class="tag on">${esc(t)}</span>`).join('')}</div>` : ''}
                ${r.text ? `<p class="review-text">${esc(r.text)}</p>` : ''}
            </article>`;
    }).join('') : `
        <div class="empty">
            <div class="empty-icon" aria-hidden="true">✍️</div>
            <p>No reviews yet. Your first review earns 🪙1.</p>
        </div>`;

    return {
        html: `
            <section class="center">
                <div class="topbar">
                    <a class="topbar-btn back-btn" href="#/profile" aria-label="Back to profile">←</a>
                    <div class="topbar-title">My Reviews</div>
                    <span class="topbar-spacer"></span>
                </div>

                <div class="review-summary card">
                    <div><b>${done.length}</b><span>Reviews</span></div>
                    <div><b>${avg ? avg.toFixed(1) : '–'}</b><span>Avg rating</span></div>
                    <div><b>🪙${left}</b><span>Rewards left today</span></div>
                </div>

                <div class="segmented" role="tablist">
                    <button class="seg ${tab === 'todo' ? 'active' : ''}" role="tab" aria-selected="${tab === 'todo'}" data-tab="todo">To review<span class="seg-count">${todo.length}</span></button>
                    <button class="seg ${tab === 'done' ? 'active' : ''}" role="tab" aria-selected="${tab === 'done'}" data-tab="done">Written<span class="seg-count">${done.length}</span></button>
                </div>

                ${tab === 'todo' ? `<p class="hint-line">Write ${store.REVIEW_MIN_CHARS}+ characters to earn 🪙1 per review (max ${store.REVIEW_DAILY_CAP} a day).</p>` : ''}
                <div id="reviewList" class="review-list">${tab === 'todo' ? todoHtml : doneHtml}</div>
                ${legal()}
            </section>
        `,
        bind() {
            document.querySelectorAll('[data-tab]').forEach(b => {
                b.onclick = () => replaceHash('#/reviews?tab=' + b.dataset.tab);
            });
            $('#reviewList').addEventListener('click', (e) => {
                const item = e.target.closest('[data-type]');
                if (!item) return;
                if (e.target.closest('[data-write], [data-edit]')) openReviewSheet(item.dataset.type, item.dataset.ref);
            });
        }
    };
}
