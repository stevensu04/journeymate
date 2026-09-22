/* Achievement badges grid + detail sheet */
import { esc, prettyDate, dayOf } from '../utils.js';
import * as store from '../store.js';
import { openSheet } from './sheet.js';

export function badgeGrid() {
    const s = store.getState();
    return `
        <div class="badges">
            ${store.ACHIEVEMENTS.map(a => {
                const got = s.achievements.find(x => x.id === a.id);
                return `
                    <button class="badge-item ${got ? 'on' : ''}" data-badge="${a.id}" aria-label="${esc(a.name)}${got ? ' (unlocked)' : ' (locked)'}">
                        <span class="badge-emoji" aria-hidden="true">${a.emoji}</span>
                        <span class="badge-name">${esc(a.name)}</span>
                    </button>`;
            }).join('')}
        </div>
    `;
}

export function wireBadges(root) {
    if (!root) return;
    root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-badge]');
        if (!b) return;
        const a = store.ACHIEVEMENTS.find(x => x.id === b.dataset.badge);
        const s = store.getState();
        const got = s.achievements.find(x => x.id === a.id);
        const [have, need] = a.progress(s);
        const pct = Math.min(100, Math.round((have / need) * 100));
        openSheet({
            title: a.name,
            body: `
                <div class="badge-detail ${got ? 'on' : ''}">
                    <div class="badge-big" aria-hidden="true">${a.emoji}</div>
                    <p class="sheet-text">${esc(a.desc)} · Reward 🪙${a.reward}</p>
                    ${got
                        ? `<p class="badge-status">Unlocked on ${prettyDate(dayOf(got.at))}</p>`
                        : `<div class="progress"><span style="width:${pct}%"></span></div>
                           <p class="badge-status">${Math.min(have, need)} / ${need}</p>`}
                </div>
            `
        });
    });
}
