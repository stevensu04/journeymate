/* Single source of truth, persisted to localStorage.
   - Schema versioned; migrates the v1 keys (jm_user / jm_trips / jm_tokens / jm_last_claim)
   - Token balance is derived from the ledger, so every +/- has a reason
*/
import { uid, today, fmt, addDays, nights, dayOf } from './utils.js';
import { placeById } from './data/places.js';

const KEY = 'jm_state';
const SCHEMA = 2;
const LEGACY_KEYS = ['jm_user', 'jm_trips', 'jm_tokens', 'jm_last_claim'];

export const REVIEW_MIN_CHARS = 20;
export const REVIEW_DAILY_CAP = 3;

export const EXPENSE_CATEGORIES = {
    stay:       { label: 'Stay',       emoji: '🏨', color: '#6366f1' },
    transport:  { label: 'Transport',  emoji: '🚌', color: '#0ea5e9' },
    food:       { label: 'Food',       emoji: '🍜', color: '#f97316' },
    activities: { label: 'Activities', emoji: '🎟️', color: '#14b8a6' },
    shopping:   { label: 'Shopping',   emoji: '🛍️', color: '#ec4899' },
    other:      { label: 'Other',      emoji: '📦', color: '#94a3b8' }
};

export const REVIEW_TAGS = ['Must-see', 'Fun', 'Good value', 'Photogenic', 'Family friendly', 'Relaxing', 'Great food', 'Crowded'];

const CITY_EMOJI = {
    'brisbane': '🌉', 'gold coast': '🏄', 'sunshine coast': '🌴', 'noosa': '🌴',
    'sydney': '🌁', 'melbourne': '☕', 'cairns': '🐠', 'byron bay': '🌊',
    'tokyo': '🗼', 'taipei': '🏙️', 'paris': '🥐', 'london': '💂', 'new york': '🗽'
};
export const CITY_SUGGESTIONS = ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Cairns', 'Noosa', 'Byron Bay', 'Sydney', 'Melbourne'];
export function emojiFor(city) { return CITY_EMOJI[String(city || '').trim().toLowerCase()] || '📍'; }

/* ---------- Notifications (toasts for rewards, achievements) ---------- */

const listeners = new Set();
export function onNotify(fn) { listeners.add(fn); }
function notify(msg) { listeners.forEach(fn => fn(msg)); }

/* ---------- Persistence ---------- */

let state = null;

function emptyState() {
    return {
        schema: SCHEMA,
        user: null,
        trips: [],
        savedPlaces: [],
        savedTips: [],
        templates: [],
        reviews: [],
        ledger: [],
        expenses: [],
        achievements: [],
        streak: { count: 0, last: '', best: 0 },
        lastClaim: '',
        stats: { aiApplied: 0 }
    };
}

function write() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* private mode / quota */ }
}

function entry(amount, reason, kind, ref, at = new Date().toISOString()) {
    return { id: uid('l'), at, amount, reason, kind, ref: ref || '' };
}

export function normalizeTrip(t) {
    let { start, end } = t;
    // v1 格式 { date: "a ~ b" } 轉成 { start, end }
    if ((!start || !end) && t.date) {
        const [s, e] = String(t.date).split('~').map(x => x.trim());
        start = start || s;
        end = end || e || s;
    }
    return {
        id: t.id || uid(),
        city: t.city || 'Custom Trip',
        start: start || '',
        end: end || start || '',
        budget: Number(t.budget) || 0,
        notes: t.notes || '',
        emoji: t.emoji || emojiFor(t.city),
        canceled: Boolean(t.canceled),
        stops: Array.isArray(t.stops) ? [...new Set(t.stops)].filter(id => placeById(id)) : []
    };
}

function migrateLegacy() {
    if (!LEGACY_KEYS.some(k => localStorage.getItem(k) !== null)) return null;
    const parse = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } };
    const s = emptyState();
    const u = parse('jm_user');
    if (u && typeof u === 'object') s.user = { email: u.email || '', name: u.name || '' };
    const trips = parse('jm_trips');
    s.trips = Array.isArray(trips) ? trips.map(normalizeTrip) : seedState().trips;
    const tokens = Number(localStorage.getItem('jm_tokens') || 0);
    if (tokens > 0) s.ledger.push(entry(tokens, 'Opening balance', 'opening'));
    s.lastClaim = localStorage.getItem('jm_last_claim') || '';
    LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
    return s;
}

function load() {
    if (state) return state;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (_) { saved = null; }
    if (!saved || typeof saved !== 'object') saved = migrateLegacy() || seedState();
    const base = emptyState();
    state = { ...base, ...saved, schema: SCHEMA };
    state.streak = { ...base.streak, ...state.streak };
    state.stats = { ...base.stats, ...state.stats };
    state.trips = state.trips.map(normalizeTrip);
    write();
    return state;
}

export function getState() { return load(); }

// 所有寫入都走這裡：存檔後重新檢查完成行程與成就
function mutate(fn) {
    const s = load();
    const result = fn(s);
    write();
    evaluate();
    return result;
}

/* ---------- Auth ---------- */

export function isAuthed() { return Boolean(load().user); }
export function user() { return load().user || {}; }
export function login(email, name) { mutate(s => { s.user = { email: email || '', name: name || '' }; }); checkIn(); }
export function updateName(name) { mutate(s => { s.user = { ...s.user, name }; }); }
export function logout() { mutate(s => { s.user = null; }); }

/* ---------- Trips ---------- */

export function tripStatus(t) {
    if (t.canceled) return 'canceled';
    if (t.end && t.end < today()) return 'completed';
    return 'upcoming';
}
export function tripDays(t) { return nights(t.start, t.end) + 1; }
export function tripBudget(t) { return t.budget * tripDays(t); }

export function trips() { return load().trips; }
export function getTrip(id) { return load().trips.find(t => t.id === id); }
export function saveTrip(trip) {
    mutate(s => {
        const t = normalizeTrip(trip);
        const idx = s.trips.findIndex(x => x.id === t.id);
        if (idx >= 0) s.trips[idx] = t; else s.trips.unshift(t);
    });
}
export function deleteTrip(id) {
    mutate(s => {
        s.trips = s.trips.filter(t => t.id !== id);
        s.expenses = s.expenses.filter(e => e.tripId !== id);
    });
}
export function addStop(tripId, placeId) {
    return mutate(s => {
        const t = s.trips.find(x => x.id === tripId);
        if (!t || t.stops.includes(placeId)) return false;
        t.stops.push(placeId);
        return true;
    });
}
export function removeStop(tripId, placeId) {
    mutate(s => {
        const t = s.trips.find(x => x.id === tripId);
        if (t) t.stops = t.stops.filter(id => id !== placeId);
    });
}

/* ---------- Saved: places, tips, templates ---------- */

export function isSaved(placeId) { return load().savedPlaces.includes(placeId); }
export function toggleSavedPlace(placeId) {
    return mutate(s => {
        if (s.savedPlaces.includes(placeId)) {
            s.savedPlaces = s.savedPlaces.filter(id => id !== placeId);
            return false;
        }
        s.savedPlaces.unshift(placeId);
        return true;
    });
}

export function saveTip(tip) {
    return mutate(s => {
        if (s.savedTips.some(t => t.text === tip.text)) return false;
        s.savedTips.unshift({ id: uid('tip'), chip: tip.chip, text: tip.text, apply: tip.apply, at: new Date().toISOString() });
        return true;
    });
}
export function removeTip(id) { mutate(s => { s.savedTips = s.savedTips.filter(t => t.id !== id); }); }

export function saveTemplate(trip, name) {
    mutate(s => {
        s.templates.unshift({
            id: uid('tpl'),
            name: name || `${trip.city} trip`,
            city: trip.city,
            emoji: trip.emoji,
            nights: nights(trip.start, trip.end),
            budget: trip.budget,
            notes: trip.notes,
            stops: [...trip.stops]
        });
    });
}
export function getTemplate(id) { return load().templates.find(t => t.id === id); }
export function removeTemplate(id) { mutate(s => { s.templates = s.templates.filter(t => t.id !== id); }); }

/* ---------- Tokens ---------- */

export function balance() { return load().ledger.reduce((sum, e) => sum + e.amount, 0); }
function hasLedger(kind, ref) { return load().ledger.some(e => e.kind === kind && e.ref === ref); }
export function earnedToday(kind) { return load().ledger.filter(e => e.kind === kind && e.amount > 0 && dayOf(e.at) === today()).length; }

// 同一個 kind + ref 只會入帳一次（防止重複刷 token）
function earn(amount, reason, kind, ref) {
    if (ref && hasLedger(kind, ref)) return false;
    load().ledger.push(entry(amount, reason, kind, ref));
    write();
    notify(`🪙 +${amount} · ${reason}`);
    return true;
}

export function canClaimDaily() { return load().lastClaim !== today(); }
export function claimDaily() {
    if (!canClaimDaily()) return false;
    load().lastClaim = today();
    earn(1, 'Daily reward', 'daily', today());
    evaluate();
    return true;
}

// 每天第一次開 app 算一次連續登入
export function checkIn() {
    const s = load();
    const t = today();
    if (!s.user || s.streak.last === t) return;
    const yesterday = fmt(addDays(new Date(), -1));
    const count = s.streak.last === yesterday ? s.streak.count + 1 : 1;
    s.streak = { count, last: t, best: Math.max(s.streak.best || 0, count) };
    write();
    if (count === 3) earn(1, '3-day streak', 'streak', t);
    if (count % 7 === 0) earn(3, `${count}-day streak`, 'streak', t);
    evaluate();
}

export function applyTip(tripId, text) {
    const trip = getTrip(tripId);
    if (!trip || balance() < 1) return false;
    load().ledger.push(entry(-1, `AI suggestion · ${trip.city}`, 'spend'));
    mutate(s => {
        const t = s.trips.find(x => x.id === tripId);
        t.notes = (t.notes ? t.notes + '\n' : '') + `AI • ${text}`;
        s.stats.aiApplied += 1;
    });
    return true;
}

/* ---------- Reviews ---------- */

export function reviewTargetName(type, ref) {
    if (type === 'trip') { const t = getTrip(ref); return t ? `${t.city} trip` : 'Deleted trip'; }
    const p = placeById(ref);
    return p ? p.name : 'Unknown place';
}
export function getReview(type, ref) { return load().reviews.find(r => r.type === type && r.ref === ref); }
export function reviews() { return load().reviews; }

export function saveReview({ type, ref, rating, tags, text }) {
    const clean = String(text || '').trim();
    const existing = getReview(type, ref);
    mutate(s => {
        const r = { id: existing ? existing.id : uid('r'), type, ref, rating, tags, text: clean, at: existing ? existing.at : new Date().toISOString() };
        if (existing) s.reviews = s.reviews.map(x => x.id === r.id ? r : x);
        else s.reviews.unshift(r);
    });
    // 20 字以上才給 token；每個對象一次、每天上限 3 次
    const ref2 = `${type}:${ref}`;
    if (clean.length >= REVIEW_MIN_CHARS && !hasLedger('review', ref2)) {
        if (earnedToday('review') >= REVIEW_DAILY_CAP) notify('Daily review reward limit reached');
        else earn(1, `Review · ${reviewTargetName(type, ref)}`, 'review', ref2);
        evaluate();
    }
}
export function deleteReview(id) { mutate(s => { s.reviews = s.reviews.filter(r => r.id !== id); }); }

// 待評論：已完成的行程 + 最近 30 天內結束的行程裡去過的地點（趁記憶還新鮮）
export function reviewTodo() {
    const s = load();
    const out = [];
    const seen = new Set();
    const recent = fmt(addDays(new Date(), -30));
    s.trips.filter(t => tripStatus(t) === 'completed').sort((a, b) => b.end.localeCompare(a.end)).forEach(t => {
        if (!getReview('trip', t.id)) out.push({ type: 'trip', ref: t.id, trip: t });
        if (t.end < recent) return;
        t.stops.forEach(pid => {
            if (seen.has(pid) || getReview('place', pid)) return;
            seen.add(pid);
            out.push({ type: 'place', ref: pid, trip: t });
        });
    });
    return out;
}

/* ---------- Expenses ---------- */

export function expensesFor(tripId) { return load().expenses.filter(e => e.tripId === tripId).sort((a, b) => b.date.localeCompare(a.date)); }
function spentIn(s, tripId) { return s.expenses.filter(e => e.tripId === tripId).reduce((sum, e) => sum + e.amount, 0); }
export function tripSpent(tripId) { return spentIn(load(), tripId); }
export function addExpense({ tripId, amount, category, note, date }) {
    mutate(s => { s.expenses.push({ id: uid('e'), tripId, amount: Math.round(amount * 100) / 100, category, note: note || '', date: date || today() }); });
}
export function deleteExpense(id) { mutate(s => { s.expenses = s.expenses.filter(e => e.id !== id); }); }

/* ---------- Achievements ---------- */

const completedCount = (s) => s.trips.filter(t => tripStatus(t) === 'completed').length;

export const ACHIEVEMENTS = [
    { id: 'first-steps', emoji: '🧭', name: 'First Steps', desc: 'Create your first trip', reward: 1, progress: s => [Math.min(s.trips.length, 1), 1] },
    { id: 'explorer', emoji: '❤️', name: 'Explorer', desc: 'Save 5 places', reward: 2, progress: s => [s.savedPlaces.length, 5] },
    { id: 'critic', emoji: '✍️', name: 'Critic', desc: 'Write 3 reviews', reward: 2, progress: s => [s.reviews.length, 3] },
    { id: 'globetrotter', emoji: '🌏', name: 'Globetrotter', desc: 'Complete 3 trips', reward: 3, progress: s => [completedCount(s), 3] },
    { id: 'on-a-roll', emoji: '🔥', name: 'On a Roll', desc: 'Open JourneyMate 7 days in a row', reward: 3, progress: s => [s.streak.best || 0, 7] },
    { id: 'budget-boss', emoji: '💰', name: 'Budget Boss', desc: 'Finish a trip within budget', reward: 2,
      progress: s => [s.trips.some(t => tripStatus(t) === 'completed' && spentIn(s, t.id) > 0 && spentIn(s, t.id) <= tripBudget(t)) ? 1 : 0, 1] },
    { id: 'ai-buddy', emoji: '🤖', name: 'AI Buddy', desc: 'Apply 3 AI suggestions', reward: 2, progress: s => [s.stats.aiApplied, 3] }
];

export function isUnlocked(id) { return load().achievements.some(a => a.id === id); }

export function evaluate() {
    const s = load();
    if (!s.user) return;
    s.trips.forEach(t => {
        if (tripStatus(t) === 'completed') earn(2, `Completed ${t.city}`, 'trip', t.id);
    });
    ACHIEVEMENTS.forEach(a => {
        if (isUnlocked(a.id)) return;
        const [have, need] = a.progress(s);
        if (have < need) return;
        s.achievements.push({ id: a.id, at: new Date().toISOString() });
        write();
        notify(`🏆 Achievement unlocked · ${a.name}`);
        earn(a.reward, `Achievement · ${a.name}`, 'achievement', a.id);
    });
}

/* ---------- Demo data ---------- */

export function resetDemo() {
    const u = load().user;
    state = seedState();
    state.user = u;
    write();
    checkIn();
}

export function seedState() {
    const d = (n) => fmt(addDays(new Date(), n));
    const at = (n, h = 10) => { const x = addDays(new Date(), n); x.setHours(h, 0, 0, 0); return x.toISOString(); };
    const s = emptyState();

    s.trips = [
        { id: 't1', city: 'Brisbane', start: d(5), end: d(7), budget: 120, emoji: '🌉', notes: 'South Bank • QAGOMA • CityCat', stops: ['qagoma', 'south-bank', 'eat-street'] },
        { id: 't2', city: 'Gold Coast', start: d(20), end: d(24), budget: 180, emoji: '🏄', notes: 'Surf & theme parks', stops: ['burleigh-np', 'miami-marketta'] },
        { id: 't3', city: 'Sunshine Coast', start: d(-12), end: d(-10), budget: 150, emoji: '🌴', notes: 'Noosa coastal walk, then Eumundi Markets on Saturday', stops: ['noosa-np', 'hastings-st', 'eumundi'] },
        { id: 't4', city: 'Cairns', start: d(-60), end: d(-56), budget: 200, emoji: '🐠', notes: 'Reef day trip • Kuranda', stops: ['reef-trip', 'kuranda-rail', 'cairns-lagoon'] },
        // Upcoming
        { id: 't5', city: 'Sunshine Coast', start: d(38), end: d(41), budget: 160, emoji: '🐊', notes: 'Family trip: Australia Zoo, then beach days in Mooloolaba', stops: ['australia-zoo', 'mooloolaba-beach', 'glass-house'] },
        { id: 't6', city: 'Sydney', start: d(75), end: d(79), budget: 220, emoji: '🌁', notes: 'Opera House tour • Bondi to Coogee walk • Manly ferry' },
        // Completed
        { id: 't7', city: 'Gold Coast', start: d(-120), end: d(-117), budget: 170, emoji: '🌊', notes: 'Hinterland day, then Burleigh for brunch', stops: ['springbrook', 'currumbin', 'burleigh-cafes'] },
        { id: 't8', city: 'Brisbane', start: d(-200), end: d(-198), budget: 110, emoji: '🐨', notes: 'First weekend in Brisbane', stops: ['lone-pine', 'mt-coot-tha', 'story-bridge'] },
        // Canceled
        { id: 't9', city: 'Melbourne', start: d(30), end: d(33), budget: 200, emoji: '☕', notes: 'Flights got too pricey. Rebook for winter.', canceled: true },
        { id: 't10', city: 'Airlie Beach', start: d(-45), end: d(-41), budget: 190, emoji: '⛵', notes: 'Called off because of a cyclone warning.', canceled: true },
        { id: 't11', city: 'Byron Bay', start: d(55), end: d(57), budget: 150, emoji: '🌊', notes: 'Clashed with exams.', canceled: true }
    ].map(normalizeTrip);

    s.savedPlaces = ['qagoma', 'lone-pine', 'howard-smith', 'burleigh-np', 'springbrook', 'west-end-cafes'];

    s.savedTips = [
        { id: 'tip1', chip: 'Timing', text: 'Popular spots are quieter before 10am. Put the busiest attraction first.', apply: 'Visit the most popular attraction before 10am', at: at(-3) }
    ];

    s.templates = [
        { id: 'tpl1', name: 'Brisbane long weekend', city: 'Brisbane', emoji: '🌉', nights: 2, budget: 120, notes: 'Culture and food by the river', stops: ['qagoma', 'south-bank', 'howard-smith'] }
    ];

    s.reviews = [
        { id: 'r1', type: 'trip', ref: 't4', rating: 5, tags: ['Must-see', 'Relaxing'], text: 'Snorkelling on the outer reef was the highlight of the year. Book the early boat, the water is much calmer.', at: at(-55) },
        { id: 'r2', type: 'place', ref: 'lone-pine', rating: 4, tags: ['Family friendly', 'Photogenic'], text: 'Great koala encounters and easy to reach by river cruise. It gets busy around lunchtime.', at: at(-20) }
    ];

    s.expenses = [
        { id: 'e1', tripId: 't4', amount: 420, category: 'stay', note: 'Esplanade hotel, 4 nights', date: d(-60) },
        { id: 'e2', tripId: 't4', amount: 239, category: 'activities', note: 'Outer reef snorkel tour', date: d(-59) },
        { id: 'e3', tripId: 't4', amount: 55, category: 'transport', note: 'Kuranda Scenic Railway', date: d(-58) },
        { id: 'e4', tripId: 't4', amount: 142.5, category: 'food', note: 'Night markets & seafood', date: d(-57) },
        { id: 'e5', tripId: 't3', amount: 190, category: 'stay', note: 'Noosa apartment, 2 nights', date: d(-12) },
        { id: 'e6', tripId: 't3', amount: 86, category: 'food', note: 'Hastings St dinner', date: d(-12) },
        { id: 'e7', tripId: 't3', amount: 40, category: 'transport', note: 'Fuel', date: d(-11) },
        { id: 'e8', tripId: 't3', amount: 35, category: 'shopping', note: 'Eumundi Markets', date: d(-10) },
        { id: 'e9', tripId: 't1', amount: 260, category: 'stay', note: 'South Bank hotel (booked)', date: d(-2) },
        { id: 'e10', tripId: 't7', amount: 330, category: 'stay', note: 'Burleigh apartment, 3 nights', date: d(-120) },
        { id: 'e11', tripId: 't7', amount: 64.9, category: 'activities', note: 'Currumbin Wildlife Sanctuary', date: d(-119) },
        { id: 'e12', tripId: 't7', amount: 118, category: 'food', note: 'Brunches & dinners', date: d(-118) },
        { id: 'e13', tripId: 't7', amount: 72, category: 'transport', note: 'Car hire fuel', date: d(-118) },
        { id: 'e14', tripId: 't8', amount: 180, category: 'stay', note: 'CBD hostel', date: d(-200) },
        { id: 'e15', tripId: 't8', amount: 159, category: 'activities', note: 'Story Bridge climb', date: d(-199) },
        { id: 'e16', tripId: 't8', amount: 95, category: 'food', note: 'Eat Street & cafés', date: d(-199) },
        { id: 'e17', tripId: 't5', amount: 69, category: 'activities', note: 'Australia Zoo tickets (pre-booked)', date: d(-4) }
    ];

    s.achievements = [
        { id: 'first-steps', at: at(-210) },
        { id: 'budget-boss', at: at(-198, 18) },
        { id: 'globetrotter', at: at(-56, 18) },
        { id: 'explorer', at: at(-15) }
    ];

    s.ledger = [
        entry(3, 'Welcome bonus', 'welcome', 'welcome', at(-210, 9)),
        entry(1, 'Achievement · First Steps', 'achievement', 'first-steps', at(-210)),
        entry(2, 'Completed Brisbane', 'trip', 't8', at(-198, 18)),
        entry(2, 'Achievement · Budget Boss', 'achievement', 'budget-boss', at(-198, 18)),
        entry(2, 'Completed Gold Coast', 'trip', 't7', at(-117, 18)),
        entry(2, 'Completed Cairns', 'trip', 't4', at(-56, 18)),
        entry(3, 'Achievement · Globetrotter', 'achievement', 'globetrotter', at(-56, 18)),
        entry(1, 'Review · Cairns trip', 'review', 'trip:t4', at(-55)),
        entry(-1, 'AI suggestion · Cairns', 'spend', '', at(-40)),
        entry(1, 'Review · Lone Pine Koala Sanctuary', 'review', 'place:lone-pine', at(-20)),
        entry(2, 'Achievement · Explorer', 'achievement', 'explorer', at(-15)),
        entry(2, 'Completed Sunshine Coast', 'trip', 't3', at(-10, 18)),
        entry(-1, 'AI suggestion · Brisbane', 'spend', '', at(-6)),
        entry(1, 'Daily reward', 'daily', d(-2), at(-2, 8)),
        entry(1, 'Daily reward', 'daily', d(-1), at(-1, 8))
    ];

    s.stats = { aiApplied: 2 };  // 再套用 1 次就解鎖 AI Buddy
    s.streak = { count: 2, last: d(-1), best: 4 };
    s.lastClaim = d(-1);
    return s;
}
