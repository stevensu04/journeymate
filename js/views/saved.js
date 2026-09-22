import { $, esc, prettyDate, dayOf, replaceHash, legal } from '../utils.js';
import * as store from '../store.js';
import { PLACES, PLACE_CATEGORIES, placeById } from '../data/places.js';
import { placeCard, wirePlaceList } from '../ui/places.js';
import { openSheet, confirmSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { render } from '../router.js';

const TABS = { places: 'Places', tips: 'Tips', templates: 'Templates' };

function tabs(current, counts) {
    return `
        <div class="segmented" role="tablist">
            ${Object.entries(TABS).map(([k, label]) => `
                <button class="seg ${k === current ? 'active' : ''}" role="tab" aria-selected="${k === current}" data-tab="${k}">
                    ${label}<span class="seg-count">${counts[k]}</span>
                </button>`).join('')}
        </div>
    `;
}

function placesTab(cat) {
    const saved = store.getState().savedPlaces.map(placeById).filter(Boolean);
    const inCat = (p) => cat === 'all' || p.category === cat;
    const mine = saved.filter(inCat);
    const discover = PLACES.filter(p => !saved.includes(p) && inCat(p)).sort((a, b) => b.rating - a.rating).slice(0, 6);
    return `
        <div class="filter-chips" role="group" aria-label="Filter by category">
            <button class="fchip ${cat === 'all' ? 'on' : ''}" data-cat="all">All</button>
            ${Object.entries(PLACE_CATEGORIES).map(([k, c]) => `<button class="fchip ${cat === k ? 'on' : ''}" data-cat="${k}">${c.emoji} ${c.label}</button>`).join('')}
        </div>
        <div class="place-list">
            ${mine.map(p => placeCard(p)).join('') || `
                <div class="empty">
                    <div class="empty-icon" aria-hidden="true">♡</div>
                    <p>${saved.length ? 'Nothing saved in this category.' : 'Tap ♡ on any place to save it here.'}</p>
                </div>`}
        </div>
        ${discover.length ? `
        <div class="section-head"><h3>Discover</h3><span class="muted small">Top-rated in Queensland</span></div>
        <div class="place-list">${discover.map(p => placeCard(p, { compact: true })).join('')}</div>` : ''}
    `;
}

function tipsTab() {
    const tips = store.getState().savedTips;
    if (!tips.length) return `
        <div class="empty">
            <div class="empty-icon" aria-hidden="true">🔖</div>
            <p>Save AI suggestions for later with the 🔖 button in the assistant.</p>
            <button class="btn sm" data-open-ai>Open AI assistant</button>
        </div>`;
    return `<div class="tip-list">${tips.map(t => `
        <article class="tip-card" data-tip="${esc(t.id)}">
            <div class="ai-row">
                <span class="ai-chip">${esc(t.chip)}</span>
                <div class="ai-text">${esc(t.text)}</div>
            </div>
            <div class="tip-foot">
                <span class="muted small">Saved ${prettyDate(dayOf(t.at))}</span>
                <span class="tip-actions">
                    <button class="chip-btn" data-tip-remove>Remove</button>
                    <button class="chip-btn primary" data-tip-apply>Apply 🪙1</button>
                </span>
            </div>
        </article>`).join('')}</div>`;
}

function templatesTab() {
    const list = store.getState().templates;
    if (!list.length) return `
        <div class="empty">
            <div class="empty-icon" aria-hidden="true">🗂️</div>
            <p>Open any trip and tap <b>Save as template</b> to reuse it later.</p>
        </div>`;
    return `<div class="tpl-list">${list.map(t => {
        const stops = t.stops.map(placeById).filter(Boolean);
        return `
        <article class="tpl-card" data-tpl="${esc(t.id)}">
            <div class="trip-thumb sm" aria-hidden="true">${esc(t.emoji)}</div>
            <div class="tpl-main">
                <div class="tpl-name">${esc(t.name)}</div>
                <div class="muted small">${esc(t.city)} · ${t.nights} night(s) · $${t.budget}/day</div>
                ${stops.length ? `<div class="tpl-stops">${stops.map(p => `<span>${esc(p.emoji)} ${esc(p.name)}</span>`).join('')}</div>` : ''}
                <div class="tip-actions">
                    <button class="chip-btn" data-tpl-remove>Delete</button>
                    <button class="chip-btn primary" data-tpl-use>Use template</button>
                </div>
            </div>
        </article>`;
    }).join('')}</div>`;
}

function openApplyTipSheet(tip) {
    const trips = store.trips().filter(t => store.tripStatus(t) === 'upcoming').sort((a, b) => a.start.localeCompare(b.start));
    const bal = store.balance();
    openSheet({
        title: 'Apply to a trip',
        body: `
            <p class="sheet-text">Adds “${esc(tip.apply)}” to the trip notes. Costs 🪙1 · you have 🪙${bal}.</p>
            ${bal < 1 ? '<p class="form-error">Not enough tokens. Claim your daily token in the Wallet.</p><a class="btn" href="#/wallet">Go to Wallet</a>' : ''}
            ${bal >= 1 && trips.length ? `<div class="pick-list">${trips.map(t => `
                <button class="pick-row" data-trip="${esc(t.id)}">
                    <span class="pick-emoji">${esc(t.emoji)}</span>
                    <span class="pick-text"><b>${esc(t.city)}</b><small>${prettyDate(t.start)} → ${prettyDate(t.end)}</small></span>
                    <span class="pick-state">＋</span>
                </button>`).join('')}</div>` : ''}
            ${bal >= 1 && !trips.length ? '<p class="sheet-text">No upcoming trips yet.</p>' : ''}
        `,
        onMount(el, close) {
            el.addEventListener('click', (e) => {
                if (e.target.closest('a')) { close(); return; }
                const row = e.target.closest('[data-trip]');
                if (!row) return;
                const t = store.getTrip(row.dataset.trip);
                close();
                if (store.applyTip(t.id, tip.apply)) {
                    store.removeTip(tip.id);
                    toast(`Added to ${t.city} notes`);
                    render();
                }
            });
        }
    });
}

export function saved(params) {
    const tab = TABS[params.tab] ? params.tab : 'places';
    const cat = params.cat && (params.cat === 'all' || PLACE_CATEGORIES[params.cat]) ? params.cat : 'all';
    const s = store.getState();
    const counts = { places: s.savedPlaces.length, tips: s.savedTips.length, templates: s.templates.length };
    const body = tab === 'places' ? placesTab(cat) : tab === 'tips' ? tipsTab() : templatesTab();

    return {
        html: `
            <section class="center">
                <div class="topbar">
                    <a class="topbar-btn back-btn" href="#/profile" aria-label="Back to profile">←</a>
                    <div class="topbar-title">Saved</div>
                    <span class="topbar-spacer"></span>
                </div>
                ${tabs(tab, counts)}
                <div id="savedBody">${body}</div>
                ${legal()}
            </section>
        `,
        bind() {
            document.querySelectorAll('[data-tab]').forEach(b => {
                b.onclick = () => replaceHash('#/saved?tab=' + b.dataset.tab);
            });
            const root = $('#savedBody');
            root.querySelectorAll('[data-cat]').forEach(b => {
                b.onclick = () => replaceHash(`#/saved?tab=places&cat=${b.dataset.cat}`);
            });
            if (tab === 'places') wirePlaceList(root, { onChange: render });

            root.addEventListener('click', async (e) => {
                if (e.target.closest('[data-open-ai]')) { $('#aiFab').click(); return; }

                const tipEl = e.target.closest('[data-tip]');
                if (tipEl) {
                    const tip = store.getState().savedTips.find(t => t.id === tipEl.dataset.tip);
                    if (e.target.closest('[data-tip-remove]')) { store.removeTip(tip.id); toast('Tip removed'); render(); }
                    if (e.target.closest('[data-tip-apply]')) openApplyTipSheet(tip);
                }

                const tplEl = e.target.closest('[data-tpl]');
                if (tplEl) {
                    const tpl = store.getTemplate(tplEl.dataset.tpl);
                    if (e.target.closest('[data-tpl-use]')) location.hash = '#/dates?tpl=' + encodeURIComponent(tpl.id);
                    if (e.target.closest('[data-tpl-remove]')) {
                        if (!await confirmSheet(`Delete the template “${tpl.name}”?`, { confirmLabel: 'Delete', danger: true })) return;
                        store.removeTemplate(tpl.id);
                        toast('Template deleted');
                        render();
                    }
                }
            });
        }
    };
}
