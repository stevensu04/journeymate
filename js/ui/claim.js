/* "Watch an ad" daily token button, shared by Profile, Wallet and the AI panel */
import { $, $$ } from '../utils.js';
import * as store from '../store.js';

// 更新畫面上所有顯示 token 的地方
export function refreshTokenUI() {
    const n = String(store.balance());
    $$('[data-token-balance]').forEach(el => { el.textContent = n; });
    const can = store.canClaimDaily();
    $$('[data-claim]').forEach(btn => {
        if (btn.dataset.busy) return;
        btn.disabled = !can;
        btn.textContent = can ? btn.dataset.label : 'Come back tomorrow';
    });
    $$('[data-claim-sub]').forEach(el => { el.textContent = can ? 'Daily reward available' : 'Next reward tomorrow'; });
}

export function wireClaimButton(btn, onDone) {
    if (!btn) return;
    btn.dataset.claim = '';
    btn.dataset.label = btn.dataset.label || btn.textContent.trim();
    btn.onclick = async () => {
        if (!store.canClaimDaily() || btn.dataset.busy) return;
        btn.dataset.busy = '1';
        btn.disabled = true;
        btn.textContent = 'Watching ad…';
        await new Promise(r => setTimeout(r, 1200)); // 模擬觀看廣告
        delete btn.dataset.busy;
        store.claimDaily();
        refreshTokenUI();
        if (onDone) onDone();
    };
    refreshTokenUI();
}
