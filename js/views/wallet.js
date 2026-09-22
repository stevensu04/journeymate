import { $, $$, esc, prettyDate, dayOf, today, money, replaceHash, legal } from '../utils.js';
import * as store from '../store.js';
import { wireClaimButton } from '../ui/claim.js';
import { badgeGrid, wireBadges } from '../ui/badges.js';
import { openSheet, confirmSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { render } from '../router.js';

const CATS = store.EXPENSE_CATEGORIES;

function tokensTab() {
    const s = store.getState();
    const streak = s.streak.count;
    const nextBonus = streak < 3 ? `${3 - streak} more day(s) to +1` : `${7 - (streak % 7)} more day(s) to +3`;
    const reviewsToday = store.earnedToday('review');
    const unlocked = s.achievements.length;
    const history = [...s.ledger].sort((a, b) => b.at.localeCompare(a.at));

    return `
        <div class="card token-card">
            <div class="token-info">
                <div class="token-label">AI Tokens</div>
                <div class="token-num">🪙 <span data-token-balance>${store.balance()}</span></div>
                <div class="token-sub" data-claim-sub></div>
            </div>
            <button class="btn outline" id="walletClaim">Get daily token</button>
        </div>

        <div class="section-head"><h3>Ways to earn</h3></div>
        <ul class="earn-list">
            <li><span class="earn-ic">📺</span><span class="earn-text"><b>Daily reward</b><small>${store.canClaimDaily() ? 'Available now' : 'Claimed today'}</small></span><span class="earn-amt">+1</span></li>
            <li><span class="earn-ic">🔥</span><span class="earn-text"><b>${streak}-day streak</b><small>${nextBonus}</small></span><span class="earn-amt">+1 / +3</span></li>
            <li><span class="earn-ic">✍️</span><span class="earn-text"><b>Write a review</b><small>${store.REVIEW_MIN_CHARS}+ characters · ${reviewsToday}/${store.REVIEW_DAILY_CAP} today</small></span><span class="earn-amt">+1</span></li>
            <li><span class="earn-ic">🏁</span><span class="earn-text"><b>Complete a trip</b><small>Once per trip</small></span><span class="earn-amt">+2</span></li>
            <li><span class="earn-ic">🏆</span><span class="earn-text"><b>Achievements</b><small>${unlocked}/${store.ACHIEVEMENTS.length} unlocked</small></span><span class="earn-amt">+1–3</span></li>
        </ul>

        <div class="section-head"><h3>Achievements</h3></div>
        <div id="walletBadges">${badgeGrid()}</div>

        <div class="section-head"><h3>History</h3><span class="muted small">${history.length} entries</span></div>
        <ul class="ledger">
            ${history.map(e => `
                <li>
                    <span class="ledger-text"><b>${esc(e.reason)}</b><small>${prettyDate(dayOf(e.at))}</small></span>
                    <span class="ledger-amt ${e.amount < 0 ? 'neg' : 'pos'}">${e.amount > 0 ? '+' : '−'}${Math.abs(e.amount)}</span>
                </li>`).join('') || '<li class="muted">No activity yet.</li>'}
        </ul>
    `;
}

function expensesTab(tripId) {
    const all = store.trips().filter(t => !t.canceled).sort((a, b) => b.start.localeCompare(a.start));
    if (!all.length) return `
        <div class="empty">
            <div class="empty-icon" aria-hidden="true">💳</div>
            <p>Create a trip to start tracking expenses.</p>
            <a class="btn sm" href="#/dates">Plan a trip</a>
        </div>`;

    const trip = all.find(t => t.id === tripId)
        || all.filter(t => store.tripStatus(t) === 'upcoming').sort((a, b) => a.start.localeCompare(b.start))[0]
        || all[0];
    const items = store.expensesFor(trip.id);
    const spent = store.tripSpent(trip.id);
    const budget = store.tripBudget(trip);
    const pct = budget ? Math.round((spent / budget) * 100) : 0;
    const byCat = Object.keys(CATS).map(k => ({ k, total: items.filter(e => e.category === k).reduce((s, e) => s + e.amount, 0) }))
        .filter(x => x.total > 0).sort((a, b) => b.total - a.total);

    return `
        <div class="form-group">
            <label for="tripSelect">Trip</label>
            <select id="tripSelect" class="input">
                ${all.map(t => `<option value="${esc(t.id)}" ${t.id === trip.id ? 'selected' : ''}>${esc(t.emoji)} ${esc(t.city)} · ${prettyDate(t.start)}</option>`).join('')}
            </select>
        </div>

        <div class="card budget-card" data-trip="${esc(trip.id)}">
            <div class="budget-top">
                <div><div class="token-label">Spent</div><div class="budget-num">${money(spent)}</div></div>
                <div class="right"><div class="token-label">Budget</div><div class="budget-num muted">${money(budget)}</div></div>
            </div>
            <div class="progress ${pct > 100 ? 'over' : pct > 85 ? 'warn' : ''}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Budget used">
                <span style="width:${Math.min(pct, 100)}%"></span>
            </div>
            <div class="budget-foot muted small">
                ${pct > 100 ? `Over budget by ${money(spent - budget)}` : `${money(budget - spent)} left · ${pct}% used`}
                · ${money(trip.budget)}/day × ${store.tripDays(trip)} day(s)
            </div>
            ${byCat.length ? `
            <div class="cat-bars">
                ${byCat.map(x => `
                    <div class="cat-bar">
                        <span class="cat-label">${CATS[x.k].emoji} ${CATS[x.k].label}</span>
                        <span class="cat-track"><span style="width:${Math.round((x.total / spent) * 100)}%;background:${CATS[x.k].color}"></span></span>
                        <span class="cat-amt">${money(x.total)}</span>
                    </div>`).join('')}
            </div>` : ''}
        </div>

        <button class="btn" id="addExpenseBtn">＋ Add expense</button>

        <div class="section-head"><h3>Expenses</h3><span class="muted small">${items.length} item(s)</span></div>
        <ul class="ledger expenses">
            ${items.map(e => `
                <li data-expense="${esc(e.id)}">
                    <span class="earn-ic">${CATS[e.category] ? CATS[e.category].emoji : '📦'}</span>
                    <span class="ledger-text"><b>${esc(e.note || CATS[e.category].label)}</b><small>${CATS[e.category].label} · ${prettyDate(e.date)}</small></span>
                    <span class="ledger-amt">${money(e.amount)}</span>
                    <button class="stop-x" data-del-expense aria-label="Delete expense">×</button>
                </li>`).join('') || '<li class="muted">No expenses yet for this trip.</li>'}
        </ul>
    `;
}

function openExpenseSheet(trip) {
    const defDate = today() < trip.start ? trip.start : today() > trip.end ? trip.end : today();
    openSheet({
        title: `Add expense · ${trip.city}`,
        body: `
            <form data-exp-form>
                <div class="form-group">
                    <label for="expAmount">Amount (AUD)</label>
                    <input id="expAmount" class="input" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" required autofocus />
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <div class="tag-picker" role="radiogroup">
                        ${Object.entries(CATS).map(([k, c], i) => `<button type="button" class="tag ${i === 0 ? 'on' : ''}" role="radio" aria-checked="${i === 0}" data-cat="${k}">${c.emoji} ${c.label}</button>`).join('')}
                    </div>
                </div>
                <div class="row two">
                    <div class="form-group">
                        <label for="expNote">Note</label>
                        <input id="expNote" class="input" maxlength="60" placeholder="e.g. Dinner" />
                    </div>
                    <div class="form-group">
                        <label for="expDate">Date</label>
                        <input id="expDate" class="input" type="date" value="${defDate}" required />
                    </div>
                </div>
                <button class="btn" type="submit">Add expense</button>
            </form>
        `,
        onMount(el, close) {
            let cat = Object.keys(CATS)[0];
            $$('[data-cat]', el).forEach(b => {
                b.onclick = () => {
                    cat = b.dataset.cat;
                    $$('[data-cat]', el).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
                };
            });
            $('[data-exp-form]', el).onsubmit = (e) => {
                e.preventDefault();
                const amount = Number($('#expAmount', el).value);
                if (!(amount > 0)) return;
                store.addExpense({ tripId: trip.id, amount, category: cat, note: $('#expNote', el).value.trim(), date: $('#expDate', el).value });
                close();
                toast(`Added ${money(amount)}`);
                render();
            };
        }
    });
}

export function wallet(params) {
    const tab = params.tab === 'expenses' ? 'expenses' : 'tokens';
    return {
        html: `
            <section class="center">
                <div class="topbar">
                    <a class="topbar-btn back-btn" href="#/profile" aria-label="Back to profile">←</a>
                    <div class="topbar-title">Wallet</div>
                    <span class="topbar-spacer"></span>
                </div>
                <div class="segmented" role="tablist">
                    <button class="seg ${tab === 'tokens' ? 'active' : ''}" role="tab" aria-selected="${tab === 'tokens'}" data-tab="tokens">🪙 Tokens</button>
                    <button class="seg ${tab === 'expenses' ? 'active' : ''}" role="tab" aria-selected="${tab === 'expenses'}" data-tab="expenses">💳 Expenses</button>
                </div>
                <div id="walletBody">${tab === 'tokens' ? tokensTab() : expensesTab(params.trip)}</div>
                ${legal()}
            </section>
        `,
        bind() {
            $$('[data-tab]').forEach(b => { b.onclick = () => replaceHash('#/wallet?tab=' + b.dataset.tab); });

            if (tab === 'tokens') {
                wireClaimButton($('#walletClaim'), render);
                wireBadges($('#walletBadges'));
                return;
            }

            const select = $('#tripSelect');
            if (!select) return;
            select.onchange = () => replaceHash(`#/wallet?tab=expenses&trip=${encodeURIComponent(select.value)}`);
            const trip = store.getTrip(select.value);
            $('#addExpenseBtn').onclick = () => openExpenseSheet(trip);
            $('.expenses').addEventListener('click', async (e) => {
                const li = e.target.closest('[data-expense]');
                if (!li || !e.target.closest('[data-del-expense]')) return;
                if (!await confirmSheet('Delete this expense?', { confirmLabel: 'Delete', danger: true })) return;
                store.deleteExpense(li.dataset.expense);
                toast('Expense deleted');
                render();
            });
        }
    };
}
