/* Shared helpers: DOM, dates, formatting */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// 使用者輸入一律跳脫後才放進 innerHTML
export function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 以「本地時間」處理日期（toISOString 是 UTC，布里斯本早上會變成前一天）
export function fmt(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
export function today() { return fmt(new Date()); }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function sameDay(a, b) { return a && b && fmt(a) === fmt(b); }
export function prettyDate(s) {
    const d = parseDate(s);
    return d ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : '-';
}
// ISO datetime（ledger / review 的時間戳）→ 本地日期
export function dayOf(iso) { return fmt(new Date(iso)); }
export function nights(start, end) {
    const a = parseDate(start), b = parseDate(end);
    return a && b ? Math.max(0, Math.round((b - a) / 86400000)) : 0;
}
export function monthCells(y, m) {
    // 6 週 * 7 天 = 42 格，從當月第一天所在週的星期日開始
    const first = new Date(y, m, 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export function uid(prefix = 't') { return prefix + Math.random().toString(36).slice(2, 9); }

export function money(n) {
    const v = Number(n) || 0;
    return '$' + v.toLocaleString('en-AU', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
}
export function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

export function parseQuery(str = '') {
    const out = {};
    new URLSearchParams(str.replace(/^[?#]/, '')).forEach((v, k) => { out[k] = v; });
    return out;
}
export function currentRoute() { return (location.hash || '#/login').split('?')[0]; }
export function currentParams() { return parseQuery(location.hash.split('?')[1] || ''); }

// 切換同頁的分頁：不新增歷史紀錄，觸發 hashchange 重新渲染
export function replaceHash(hash) { location.replace(hash); }

export const legal = () => `<p class="legal">© 2025 JourneyMate</p>`;
