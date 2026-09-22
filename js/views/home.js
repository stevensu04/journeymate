import { $, $$, esc, prettyDate, currentParams, legal } from '../utils.js';
import * as store from '../store.js';
import { toast } from '../ui/toast.js';
import { confirmSheet } from '../ui/sheet.js';
import { openReviewSheet } from '../ui/review-sheet.js';
import { stars } from '../ui/stars.js';
import { render } from '../router.js';

const FILTERS = ['upcoming', 'completed', 'canceled'];

function card(t) {
    const status = store.tripStatus(t);
    const review = status === 'completed' ? store.getReview('trip', t.id) : null;
    return `
        <article class="trip-card" data-id="${esc(t.id)}">
            <div class="trip-thumb" aria-hidden="true">${esc(t.emoji)}</div>
            <div class="trip-main">
                <div class="trip-title">${esc(t.city)}</div>
                <div class="trip-dates">
                    <div><span class="muted">Check In</span><strong>${prettyDate(t.start)}</strong></div>
                    <div><span class="muted">Check Out</span><strong>${prettyDate(t.end)}</strong></div>
                </div>
                <div class="trip-cta">
                    <button class="pill" data-action="view">VIEW DETAILS</button>
                    ${status === 'completed'
                        ? (review ? `<span class="trip-rated">${stars(review.rating, { size: 'sm' })}</span>`
                                  : `<button class="pill alt" data-action="rate">★ RATE TRIP</button>`)
                        : ''}
                </div>
            </div>
            <button class="card-x" title="Remove" aria-label="Remove ${esc(t.city)}" data-action="delete">×</button>
        </article>
    `;
}

export function home() {
    const current = FILTERS.includes(currentParams().f) ? currentParams().f : 'upcoming';
    const list = store.trips()
        .filter(t => store.tripStatus(t) === current)
        .sort((a, b) => current === 'upcoming' ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start));
    const todo = store.reviewTodo().length;

    return {
        html: `
            <section class="center">
                <div class="topbar">
                    <div class="topbar-title">MyJourney</div>
                    <button class="topbar-btn" id="newTripBtn" aria-label="New trip">＋</button>
                </div>

                <div class="segmented" role="tablist">
                    ${FILTERS.map(f => `<button class="seg ${f === current ? 'active' : ''}" role="tab" aria-selected="${f === current}" data-filter="${f}">${f.charAt(0).toUpperCase() + f.slice(1)}</button>`).join('')}
                </div>

                ${todo && current !== 'canceled' ? `
                <a class="nudge" href="#/reviews">
                    <span aria-hidden="true">✍️</span>
                    <span><b>${todo} to review</b> · earn 🪙 for helpful reviews</span>
                    <span class="chev" aria-hidden="true">›</span>
                </a>` : ''}

                <div id="tripList" class="trip-list">
                    ${list.map(card).join('') || `
                        <div class="empty">
                            <div class="empty-icon" aria-hidden="true">🧭</div>
                            <p>No ${current} trips.</p>
                            ${current === 'upcoming' ? '<a class="btn sm" href="#/dates">Plan a trip</a>' : ''}
                        </div>`}
                </div>
                ${legal()}
            </section>
        `,
        bind() {
            $$('.segmented .seg').forEach(btn => {
                btn.onclick = () => location.replace('#/home?f=' + btn.dataset.filter);
            });

            $('#tripList').addEventListener('click', async (e) => {
                const id = e.target.closest('.trip-card')?.dataset.id;
                if (!id) return;
                const t = store.getTrip(id);
                if (e.target.closest('[data-action="view"]')) {
                    location.hash = '#/planner?t=' + encodeURIComponent(id);
                } else if (e.target.closest('[data-action="rate"]')) {
                    openReviewSheet('trip', id);
                } else if (e.target.closest('[data-action="delete"]')) {
                    if (!await confirmSheet(`Remove your ${t.city} trip and its expenses?`, { title: 'Remove trip', confirmLabel: 'Remove', danger: true })) return;
                    store.deleteTrip(id);
                    toast('Trip removed');
                    render();
                }
            });

            $('#newTripBtn').onclick = () => { location.hash = '#/dates'; };
        }
    };
}
