import { $, $$, esc, fmt, today, addDays, prettyDate, nights, uid, capitalize, money, legal } from '../utils.js';
import * as store from '../store.js';
import { PLACE_CATEGORIES, placeById, placesForCity } from '../data/places.js';
import { toast } from '../ui/toast.js';
import { openSheet, promptSheet } from '../ui/sheet.js';
import { openReviewSheet } from '../ui/review-sheet.js';
import { stars } from '../ui/stars.js';
import { render } from '../router.js';

function stopRow(p, { removable, reviewable }) {
    const cat = PLACE_CATEGORIES[p.category];
    const review = store.getReview('place', p.id);
    return `
        <li class="stop" data-stop="${esc(p.id)}">
            <span class="stop-emoji" aria-hidden="true">${esc(p.emoji)}</span>
            <span class="stop-text"><b>${esc(p.name)}</b><small>${cat.label} · ${esc(p.area)}</small></span>
            ${reviewable ? (review ? stars(review.rating, { size: 'sm' }) : `<button class="chip-btn" data-review-stop>✍️ Review</button>`) : ''}
            ${removable ? `<button class="stop-x" data-remove-stop aria-label="Remove ${esc(p.name)}">×</button>` : ''}
        </li>
    `;
}

function openAddStopsSheet(trip) {
    const saved = store.getState().savedPlaces.map(placeById).filter(Boolean);
    const local = placesForCity(trip.city).filter(p => !saved.includes(p));
    const row = (p) => {
        const has = trip.stops.includes(p.id);
        return `
            <button class="pick-row" data-add="${esc(p.id)}" ${has ? 'disabled' : ''}>
                <span class="pick-emoji">${esc(p.emoji)}</span>
                <span class="pick-text"><b>${esc(p.name)}</b><small>${esc(p.area)}, ${esc(p.city)}</small></span>
                <span class="pick-state">${has ? '✓' : '＋'}</span>
            </button>`;
    };
    openSheet({
        title: 'Add stops',
        body: `
            ${saved.length ? `<h4 class="sheet-sub">From your Saved</h4><div class="pick-list">${saved.map(row).join('')}</div>` : ''}
            ${local.length ? `<h4 class="sheet-sub">Popular in ${esc(trip.city)}</h4><div class="pick-list">${local.map(row).join('')}</div>` : ''}
            ${!saved.length && !local.length ? `<p class="sheet-text">No picks for ${esc(trip.city)} yet. Save places from the Map or Saved tab first.</p>` : ''}
        `,
        onMount(el) {
            el.addEventListener('click', (e) => {
                const b = e.target.closest('[data-add]');
                if (!b || b.disabled) return;
                store.addStop(trip.id, b.dataset.add);
                b.disabled = true;
                b.querySelector('.pick-state').textContent = '✓';
                render();
            });
        }
    });
}

export function planner(params) {
    // 沒有 t 參數 = 新行程草稿，按 Create 才會真正建立
    const existing = params.t ? store.getTrip(params.t) : null;
    if (params.t && !existing) return { redirect: '#/home' };

    const isNew = !existing;
    const tpl = isNew && params.tpl ? store.getTemplate(params.tpl) : null;
    const t = existing || store.normalizeTrip({
        id: uid(),
        city: tpl ? tpl.city : '',
        emoji: tpl ? tpl.emoji : '',
        budget: tpl ? tpl.budget : 100,
        notes: tpl ? tpl.notes : '',
        stops: tpl ? tpl.stops : [],
        start: params.start || today(),
        end: params.end || fmt(addDays(new Date(), 1))
    });
    const status = store.tripStatus(t);
    const spent = isNew ? 0 : store.tripSpent(t.id);
    const budget = store.tripBudget(t);
    const stopPlaces = t.stops.map(placeById).filter(Boolean);
    const subtitle = isNew
        ? (tpl ? `From template · ${tpl.name}` : 'Where are you heading?')
        : status === 'canceled' ? 'Canceled' : `${nights(t.start, t.end)} night(s) · ${capitalize(status)}`;

    return {
        html: `
            <section class="center">
                <div class="detail-hero">
                    <button class="back" id="backFromPlanner" aria-label="Back">←</button>
                    <div class="hero-emoji" aria-hidden="true">${esc(t.emoji)}</div>
                    <h1 class="title">${isNew ? (tpl ? esc(t.city) : 'New trip') : esc(t.city)}</h1>
                    <p class="subtitle">${esc(subtitle)}</p>
                </div>

                <div class="detail-card">
                    ${isNew ? '' : `
                    <div class="chips">
                        <span class="chip">📅 ${prettyDate(t.start)} → ${prettyDate(t.end)}</span>
                        <span class="chip">💸 ${money(t.budget)}/day</span>
                        <a class="chip link-chip ${spent > budget ? 'over' : ''}" href="#/wallet?tab=expenses&trip=${esc(t.id)}">💳 ${money(spent)} / ${money(budget)} spent</a>
                    </div>

                    <div class="actions-row">
                        <button class="btn sm outline" id="openMapFromPlanner">📍 Map</button>
                        <button class="btn sm outline" id="shareTripBtn">Share</button>
                        <button class="btn sm outline" id="templateBtn">Save as template</button>
                        ${status === 'completed' ? `<button class="btn sm outline" id="rateTripBtn">${store.getReview('trip', t.id) ? '✏️ Edit review' : '★ Rate trip'}</button>` : ''}
                        ${status === 'completed' ? '' : `<button class="btn sm outline" id="cancelTripBtn">${t.canceled ? 'Restore trip' : 'Cancel trip'}</button>`}
                    </div>`}

                    <div class="accordion" id="plannerAcc">
                        ${isNew ? '' : `
                        <div class="acc-item open">
                            <button class="acc-head" data-acc-toggle aria-expanded="true">
                                <span>Stops <span class="count">${stopPlaces.length}</span></span>
                                <span class="arrow" aria-hidden="true">›</span>
                            </button>
                            <div class="acc-content">
                                ${stopPlaces.length
                                    ? `<ul class="stops">${stopPlaces.map(p => stopRow(p, { removable: status !== 'completed', reviewable: status === 'completed' })).join('')}</ul>`
                                    : '<p class="muted small">No stops yet. Add places you want to visit.</p>'}
                                ${status === 'upcoming' ? '<button class="btn sm outline" id="addStopsBtn">＋ Add stops</button>' : ''}
                            </div>
                        </div>

                        <div class="acc-item open">
                            <button class="acc-head" data-acc-toggle aria-expanded="true">
                                <span>Notes</span>
                                <span class="arrow" aria-hidden="true">›</span>
                            </button>
                            <div class="acc-content">
                                <p class="notes">${esc(t.notes) || '<span class="muted">Add stops, food, activities…</span>'}</p>
                            </div>
                        </div>`}

                        <div class="acc-item ${isNew ? 'open' : ''}">
                            <button class="acc-head" data-acc-toggle aria-expanded="${isNew}">
                                <span>${isNew ? 'Trip details' : 'Edit plan'}</span>
                                <span class="arrow" aria-hidden="true">›</span>
                            </button>
                            <div class="acc-content">
                                <form id="editForm" class="form" autocomplete="off">
                                    <div class="form-group">
                                        <label for="city">Destination</label>
                                        <input id="city" class="input" value="${isNew && !tpl ? '' : esc(t.city)}" placeholder="e.g. Brisbane" list="cityList" required />
                                        <datalist id="cityList">${store.CITY_SUGGESTIONS.map(c => `<option value="${c}">`).join('')}</datalist>
                                    </div>
                                    <div class="row two">
                                        <div class="form-group">
                                            <label for="start">Start date</label>
                                            <input id="start" type="date" class="input" value="${esc(t.start)}" required />
                                        </div>
                                        <div class="form-group">
                                            <label for="end">End date</label>
                                            <input id="end" type="date" class="input" value="${esc(t.end)}" min="${esc(t.start)}" required />
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="budget">Budget (AUD / day)</label>
                                        <input id="budget" type="number" class="input" min="0" step="10" inputmode="numeric" value="${t.budget}" />
                                    </div>
                                    <div class="form-group">
                                        <label for="notes">Notes</label>
                                        <textarea id="notes" class="input" rows="4" placeholder="Add stops, food, activities...">${esc(t.notes)}</textarea>
                                    </div>
                                    ${isNew && stopPlaces.length ? `<p class="muted small">Includes ${stopPlaces.length} stop(s) from the template.</p>` : ''}
                                    <div class="detail-cta">
                                        <button class="btn" type="submit">${isNew ? 'Create trip' : 'Save changes'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                ${legal()}
            </section>
        `,
        bind() {
            $$('#plannerAcc [data-acc-toggle]').forEach(h => {
                h.onclick = () => {
                    const open = h.parentElement.classList.toggle('open');
                    h.setAttribute('aria-expanded', String(open));
                };
            });

            $('#backFromPlanner').onclick = () => { location.hash = '#/home'; };

            const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };

            on('#openMapFromPlanner', () => { location.hash = '#/map?q=' + encodeURIComponent(t.city); });
            on('#shareTripBtn', async () => {
                const stopsText = stopPlaces.length ? '\nStops: ' + stopPlaces.map(p => p.name).join(', ') : '';
                const text = `${t.city}: ${prettyDate(t.start)} → ${prettyDate(t.end)}${stopsText}${t.notes ? '\n' + t.notes : ''}`;
                try {
                    if (navigator.share) { await navigator.share({ title: `JourneyMate · ${t.city}`, text }); return; }
                    await navigator.clipboard.writeText(text);
                    toast('Trip summary copied!');
                } catch (err) {
                    if (err && err.name !== 'AbortError') toast('Could not share this trip.');
                }
            });
            on('#templateBtn', async () => {
                const name = await promptSheet({ title: 'Save as template', label: 'Template name', value: `${t.city} ${nights(t.start, t.end)}-night trip` });
                if (!name) return;
                store.saveTemplate(t, name);
                toast('Template saved');
            });
            on('#rateTripBtn', () => openReviewSheet('trip', t.id));
            on('#cancelTripBtn', () => {
                store.saveTrip({ ...t, canceled: !t.canceled });
                toast(t.canceled ? 'Trip restored' : 'Trip canceled');
                render();
            });
            on('#addStopsBtn', () => openAddStopsSheet(t));

            const stops = $('.stops');
            if (stops) stops.addEventListener('click', (e) => {
                const id = e.target.closest('[data-stop]')?.dataset.stop;
                if (!id) return;
                if (e.target.closest('[data-remove-stop]')) { store.removeStop(t.id, id); render(); }
                if (e.target.closest('[data-review-stop]')) openReviewSheet('place', id);
            });

            const form = $('#editForm');
            form.start.onchange = () => {
                form.end.min = form.start.value;
                if (form.end.value < form.start.value) form.end.value = form.start.value;
            };
            form.onsubmit = (e) => {
                e.preventDefault();
                const city = form.city.value.trim() || 'Custom Trip';
                const fresh = isNew ? t : store.getTrip(t.id);
                const updated = {
                    ...fresh,
                    city,
                    emoji: city === fresh.city && fresh.emoji ? fresh.emoji : store.emojiFor(city),
                    start: form.start.value,
                    end: form.end.value < form.start.value ? form.start.value : form.end.value,
                    budget: Number(form.budget.value) || 0,
                    notes: form.notes.value.trim()
                };
                store.saveTrip(updated);
                toast(isNew ? 'Trip created!' : 'Saved!');
                if (isNew) location.hash = '#/planner?t=' + encodeURIComponent(updated.id);
                else render();
            };

            if (isNew && !tpl) form.city.focus();
        }
    };
}
