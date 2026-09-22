/* Floating AI assistant: context-aware tips that cost 1 token to apply */
import { $, esc, currentRoute, currentParams } from '../utils.js';
import * as store from '../store.js';
import { toast } from './toast.js';
import { wireClaimButton, refreshTokenUI } from './claim.js';
import { render } from '../router.js';

export function suggestionsFor(t) {
    const city = t ? t.city : 'your city';
    return [
        { chip: 'Weather', text: `Showers are possible in ${city}. Keep an indoor option such as a museum or gallery in your plan.`, apply: 'Rainy-day backup: museum / gallery visit' },
        { chip: 'Traffic', text: 'Traffic usually peaks around 5pm. Consider an earlier dinner close to where you are staying.', apply: 'Dinner 17:00 near accommodation' },
        { chip: 'Budget', text: `Your budget is ~$${t ? t.budget : 100}/day. Public transport day passes can save around 30% compared to rideshare.`, apply: 'Use a public transport day pass' },
        { chip: 'Timing', text: `Popular spots in ${city} are quieter before 10am. Put the busiest attraction first.`, apply: 'Visit the most popular attraction before 10am' },
        { chip: 'Local', text: `Check for weekend markets in ${city}. They are a cheap way to try local food.`, apply: 'Weekend local market for lunch' }
    ];
}

let index = Math.floor(Math.random() * 5);

function targetTrip() {
    const params = currentParams();
    if (currentRoute() === '#/planner' && params.t) {
        const t = store.getTrip(params.t);
        if (t && store.tripStatus(t) !== 'canceled') return t;
    }
    return store.trips().filter(t => store.tripStatus(t) === 'upcoming').sort((a, b) => a.start.localeCompare(b.start))[0] || null;
}

function renderAi() {
    const target = targetTrip();
    const list = suggestionsFor(target);
    const s = list[index % list.length];
    const saved = store.getState().savedTips.some(x => x.text === s.text);

    $('#aiSuggestions').innerHTML = `
        <div class="ai-card">
            <div class="ai-row">
                <span class="ai-chip">${esc(s.chip)}</span>
                <div class="ai-text">${esc(s.text)}</div>
            </div>
            <div class="ai-target">${target ? `Applies to: <b>${esc(target.city)}</b>` : 'Create a trip to apply suggestions.'}</div>
            <div class="ai-actions three">
                <button class="btn outline" id="aiNext">Another</button>
                <button class="btn outline" id="aiSave" ${saved ? 'disabled' : ''}>${saved ? 'Saved ✓' : '🔖 Save'}</button>
                <button class="btn" id="aiApply" ${target && store.balance() > 0 ? '' : 'disabled'}>Apply 🪙1</button>
            </div>
        </div>
    `;
    refreshTokenUI();

    $('#aiNext').onclick = () => { index++; renderAi(); };
    $('#aiSave').onclick = () => {
        store.saveTip(s);
        toast('Saved to your tips');
        renderAi();
    };
    $('#aiApply').onclick = () => {
        if (!target) return;
        if (!store.applyTip(target.id, s.apply)) { toast('Not enough tokens. Claim your daily token first.'); return; }
        toast(`Added to ${target.city} notes`);
        $('#aiFab .dot')?.remove();
        index++;
        closeAi();
        render();
    };
}

export function openAi() {
    renderAi();
    const panel = $('#aiPanel');
    panel.hidden = false;
    panel.classList.add('show');
    $('#aiFab').setAttribute('aria-expanded', 'true');
}

export function closeAi() {
    const panel = $('#aiPanel');
    if (!panel) return;
    panel.classList.remove('show');
    panel.hidden = true;
    $('#aiFab').setAttribute('aria-expanded', 'false');
}

export function initAi() {
    $('#aiFab').onclick = () => ($('#aiPanel').classList.contains('show') ? closeAi() : openAi());
    $('#aiClose').onclick = closeAi;
    wireClaimButton($('#aiClaimBtn'), renderAi);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAi(); });
}
