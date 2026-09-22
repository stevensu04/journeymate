/* JourneyMate Prototype App (vanilla JS SPA)
   - Keeps CSS/JS in separate files (per Steven's preference)
   - Four-space indentation
   - All data lives in localStorage; nothing is sent to a server
*/
(function () {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    /* ================= Utilities ================= */

    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    // 使用者輸入一律跳脫後才放進 innerHTML
    function esc(v) {
        return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // 以「本地時間」處理日期（toISOString 是 UTC，布里斯本早上會變成前一天）
    function fmt(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    function parseDate(s) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
        return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    }
    function today() { return fmt(new Date()); }
    function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function sameDay(a, b) { return a && b && fmt(a) === fmt(b); }
    function prettyDate(s) {
        const d = parseDate(s);
        return d ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : '-';
    }
    function nights(start, end) {
        const a = parseDate(start), b = parseDate(end);
        return a && b ? Math.max(0, Math.round((b - a) / 86400000)) : 0;
    }
    function monthCells(y, m) {
        // 6 週 * 7 天 = 42 格，從當月第一天所在週的星期日開始
        const first = new Date(y, m, 1);
        const start = addDays(first, -first.getDay());
        return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    }
    function uid() { return 't' + Math.random().toString(36).slice(2, 9); }

    function parseQuery(str = '') {
        const out = {};
        new URLSearchParams(str.replace(/^[?#]/, '')).forEach((v, k) => { out[k] = v; });
        return out;
    }
    function currentRoute() { return (location.hash || '#/login').split('?')[0]; }
    function currentParams() { return parseQuery(location.hash.split('?')[1] || ''); }

    function readJSON(key, fallback) {
        try {
            const v = JSON.parse(localStorage.getItem(key));
            return v ?? fallback;
        } catch (_) { return fallback; }
    }
    function writeJSON(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* private mode */ }
    }

    let toastTimer = 0;
    function toast(msg) {
        const el = $('#toast');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }

    const CITY_EMOJI = {
        'brisbane': '🌉', 'gold coast': '🏄', 'sunshine coast': '🌴', 'noosa': '🌴',
        'sydney': '🌁', 'melbourne': '☕', 'cairns': '🐠', 'byron bay': '🌊',
        'tokyo': '🗼', 'taipei': '🏙️', 'paris': '🥐', 'london': '💂', 'new york': '🗽'
    };
    function emojiFor(city) { return CITY_EMOJI[String(city || '').trim().toLowerCase()] || '📍'; }

    /* ================= State ================= */

    function seedTrips() {
        // 範例行程以「今天」為基準，永遠會有 upcoming / completed 可以展示
        const d = (n) => fmt(addDays(new Date(), n));
        return [
            { id: 't1', city: 'Brisbane', start: d(5), end: d(7), budget: 120, notes: 'South Bank • QAGOMA • CityCat', emoji: '🌉' },
            { id: 't2', city: 'Gold Coast', start: d(20), end: d(24), budget: 180, notes: 'Surf & Theme Parks', emoji: '🏄' },
            { id: 't3', city: 'Sunshine Coast', start: d(-30), end: d(-28), budget: 150, notes: 'Noosa National Park', emoji: '🌴' }
        ];
    }

    // 舊版資料格式 { date: "a ~ b" } 轉成 { start, end }
    function normalizeTrip(t) {
        let { start, end } = t;
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
            canceled: Boolean(t.canceled)
        };
    }

    const AppState = {
        get isAuthed() { return Boolean(localStorage.getItem('jm_user')); },
        login(email, name) { writeJSON('jm_user', { email, name: name || '' }); },
        logout() { localStorage.removeItem('jm_user'); },
        get user() { return readJSON('jm_user', {}); },

        get tokens() { return Number(localStorage.getItem('jm_tokens') || '0'); },
        set tokens(v) { localStorage.setItem('jm_tokens', String(Math.max(0, v | 0))); },
        get lastClaim() { return localStorage.getItem('jm_last_claim') || ''; },
        set lastClaim(d) { localStorage.setItem('jm_last_claim', d); },
        canClaimDaily() { return this.lastClaim !== today(); },
        claimDaily() {
            if (!this.canClaimDaily()) return false;
            this.tokens = this.tokens + 1;
            this.lastClaim = today();
            return true;
        },
        consumeToken(n = 1) {
            if (this.tokens < n) return false;
            this.tokens = this.tokens - n;
            return true;
        },

        get trips() {
            const saved = readJSON('jm_trips', null);
            if (!Array.isArray(saved)) {
                const seeded = seedTrips();
                writeJSON('jm_trips', seeded);
                return seeded;
            }
            return saved.map(normalizeTrip);
        },
        set trips(list) { writeJSON('jm_trips', list.map(normalizeTrip)); },
        getTrip(id) { return this.trips.find(t => t.id === id); },
        saveTrip(trip) {
            const list = this.trips;
            const idx = list.findIndex(t => t.id === trip.id);
            if (idx >= 0) list[idx] = trip; else list.unshift(trip);
            this.trips = list;
        },
        deleteTrip(id) { this.trips = this.trips.filter(t => t.id !== id); }
    };

    function tripStatus(t) {
        if (t.canceled) return 'canceled';
        if (t.end && t.end < today()) return 'completed';
        return 'upcoming';
    }

    /* ================= Views ================= */
    // 每個 view 回傳 { html, bind }，bind 在 DOM 掛上後執行

    const legal = () => `<p class="legal">© ${new Date().getFullYear()} JourneyMate (Prototype)</p>`;

    const Views = {
        login() {
            return {
                html: `
                    <section class="card center auth-card" aria-labelledby="loginTitle">
                        <div class="brand">
                            <div class="brand-logo">
                                <img src="assets/icon-192.png" alt="" width="77" height="77">
                            </div>
                            <h1 class="brand-title">JourneyMate</h1>
                            <p class="brand-sub">Plan less, experience more</p>
                        </div>

                        <h2 class="title" id="loginTitle">Sign in</h2>

                        <form id="loginForm" autocomplete="on">
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input id="email" name="email" class="input" type="email" placeholder="your.email@example.com" autocomplete="email" required />
                            </div>
                            <div class="form-group">
                                <label for="password">Password</label>
                                <input id="password" name="password" class="input" type="password" placeholder="••••••••" autocomplete="current-password" required minlength="4" />
                            </div>
                            <button class="btn" type="submit">Sign In</button>
                        </form>

                        <div class="actions">
                            <button class="btn outline" data-social>Continue with Google</button>
                            <button class="btn outline" data-social>Continue with Facebook</button>
                        </div>

                        <p class="helper"><a href="#" class="link" id="forgotLink">Forgot Password?</a></p>
                        <hr class="soft" />
                        <p class="helper">Don't have an account? <a href="#/signup" class="link">Sign Up</a></p>
                        <p class="helper"><button class="link-btn" id="demoBtn">Just looking? Try the demo →</button></p>
                        ${legal()}
                    </section>
                `,
                bind() {
                    const form = $('#loginForm');
                    form.onsubmit = (e) => {
                        e.preventDefault();
                        AppState.login(form.email.value.trim());
                        location.hash = '#/home';
                    };
                    $('#forgotLink').onclick = (e) => {
                        e.preventDefault();
                        toast('Demo: a reset link would be emailed to you.');
                    };
                    $$('[data-social]').forEach(b => { b.onclick = () => toast('Social sign-in is mocked in this prototype.'); });
                    $('#demoBtn').onclick = () => {
                        AppState.login('demo@journeymate.app', 'Demo Traveler');
                        location.hash = '#/home';
                    };
                }
            };
        },

        signup() {
            return {
                html: `
                    <section class="card center auth-card" aria-labelledby="signupTitle">
                        <h2 class="title" id="signupTitle">Create account</h2>
                        <p class="kicker">Takes less than a minute.</p>
                        <form id="signupForm">
                            <div class="form-group">
                                <label for="name">Name</label>
                                <input id="name" class="input" placeholder="Ada Lovelace" autocomplete="name" required />
                            </div>
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input id="email" type="email" class="input" placeholder="you@example.com" autocomplete="email" required />
                            </div>
                            <div class="row two">
                                <div class="form-group">
                                    <label for="password">Password</label>
                                    <input id="password" type="password" class="input" placeholder="Create a password" autocomplete="new-password" minlength="4" required />
                                </div>
                                <div class="form-group">
                                    <label for="confirm">Confirm</label>
                                    <input id="confirm" type="password" class="input" placeholder="Repeat password" autocomplete="new-password" minlength="4" required />
                                </div>
                            </div>
                            <p class="form-error" id="signupError" role="alert" hidden></p>
                            <button class="btn" type="submit">Create account</button>
                            <p class="helper">Already have an account? <a class="link" href="#/login">Sign in</a></p>
                        </form>
                        ${legal()}
                    </section>
                `,
                bind() {
                    const form = $('#signupForm');
                    const err = $('#signupError');
                    form.onsubmit = (e) => {
                        e.preventDefault();
                        if (form.password.value !== form.confirm.value) {
                            err.textContent = 'Passwords do not match.';
                            err.hidden = false;
                            form.confirm.focus();
                            return;
                        }
                        AppState.login(form.email.value.trim(), form.name.value.trim());
                        location.hash = '#/home';
                    };
                }
            };
        },

        home() {
            const card = (t) => `
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
                        </div>
                    </div>
                    <button class="card-x" title="Remove" aria-label="Remove ${esc(t.city)}" data-action="delete">×</button>
                </article>
            `;
            const filter = ['upcoming', 'completed', 'canceled'].includes(currentParams().f) ? currentParams().f : 'upcoming';

            return {
                html: `
                    <section class="center">
                        <div class="topbar">
                            <div class="topbar-title">MyJourney</div>
                            <button class="topbar-btn" id="newTripBtn" aria-label="New trip">＋</button>
                        </div>

                        <div class="segmented" role="tablist">
                            <button class="seg" role="tab" data-filter="upcoming">Upcoming</button>
                            <button class="seg" role="tab" data-filter="completed">Completed</button>
                            <button class="seg" role="tab" data-filter="canceled">Canceled</button>
                        </div>

                        <div id="tripList" class="trip-list"></div>
                        ${legal()}
                    </section>
                `,
                bind() {
                    const listEl = $('#tripList');
                    let current = filter;

                    function render() {
                        $$('.segmented .seg').forEach(b => {
                            const on = b.dataset.filter === current;
                            b.classList.toggle('active', on);
                            b.setAttribute('aria-selected', String(on));
                        });
                        const trips = AppState.trips
                            .filter(t => tripStatus(t) === current)
                            .sort((a, b) => current === 'upcoming' ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start));
                        listEl.innerHTML = trips.map(card).join('') || `
                            <div class="empty">
                                <div class="empty-icon" aria-hidden="true">🧭</div>
                                <p>No ${current} trips.</p>
                                ${current === 'upcoming' ? '<button class="btn sm" id="emptyNew">Plan a trip</button>' : ''}
                            </div>`;
                        const emptyNew = $('#emptyNew');
                        if (emptyNew) emptyNew.onclick = () => { location.hash = '#/dates'; };
                    }

                    $$('.segmented .seg').forEach(btn => {
                        btn.onclick = () => {
                            current = btn.dataset.filter;
                            history.replaceState(null, '', '#/home?f=' + current);
                            render();
                        };
                    });

                    listEl.addEventListener('click', (e) => {
                        const id = e.target.closest('.trip-card')?.dataset.id;
                        if (!id) return;
                        if (e.target.closest('[data-action="view"]')) {
                            location.hash = '#/planner?t=' + encodeURIComponent(id);
                        } else if (e.target.closest('[data-action="delete"]')) {
                            const t = AppState.getTrip(id);
                            if (t && confirm(`Remove "${t.city}"?`)) {
                                AppState.deleteTrip(id);
                                render();
                                toast('Trip removed');
                            }
                        }
                    });

                    $('#newTripBtn').onclick = () => { location.hash = '#/dates'; };
                    render();
                }
            };
        },

        dates() {
            const now = new Date();
            return {
                html: `
                    <section class="center">
                        <div class="calendar" id="dateRangeView">
                            <div class="cal-header">
                                <button class="nav-btn" id="calBack" aria-label="Back">←</button>
                                <div class="cal-title">Select travel dates</div>
                                <div class="cal-nav">
                                    <button id="calPrev" aria-label="Previous month">‹</button>
                                    <button id="calNext" aria-label="Next month">›</button>
                                </div>
                            </div>

                            <div class="cal-month" id="calMonth"></div>
                            <div class="cal-weekdays">${WEEKDAYS.map(w => `<span>${w}</span>`).join('')}</div>
                            <div class="cal-grid" id="calGrid"></div>
                            <div class="cal-summary" id="calSummary">Tap a start date</div>

                            <div class="actions row two">
                                <button class="btn outline" id="clearDates">Clear</button>
                                <button class="btn" id="useDates" disabled>Use dates</button>
                            </div>
                        </div>
                        ${legal()}
                    </section>
                `,
                bind() {
                    let year = now.getFullYear();
                    let month = now.getMonth();
                    let start = null, end = null;
                    const todayDate = parseDate(today());

                    function render() {
                        $('#calMonth').textContent = `${MONTHS[month]} ${year}`;
                        // 不允許往回翻到過去的月份
                        $('#calPrev').disabled = year === now.getFullYear() && month === now.getMonth();
                        $('#calGrid').innerHTML = monthCells(year, month).map(d => {
                            const inMonth = d.getMonth() === month;
                            const past = d < todayDate;
                            const classes = ['cal-day'];
                            if (!inMonth) classes.push('muted');
                            if (past) classes.push('past');
                            if (sameDay(d, todayDate)) classes.push('today');
                            if (start && end && d > start && d < end) classes.push('in-range');
                            if (sameDay(d, start) || sameDay(d, end)) classes.push('selected');
                            return `<button class="${classes.join(' ')}" data-date="${fmt(d)}" ${inMonth && !past ? '' : 'disabled'}>${d.getDate()}</button>`;
                        }).join('');

                        const summary = $('#calSummary');
                        if (start && end) summary.textContent = `${prettyDate(fmt(start))} → ${prettyDate(fmt(end))} · ${nights(fmt(start), fmt(end))} night(s)`;
                        else if (start) summary.textContent = `${prettyDate(fmt(start))} → pick an end date`;
                        else summary.textContent = 'Tap a start date';
                        $('#useDates').disabled = !(start && end);
                    }

                    $('#calBack').onclick = () => history.length > 1 ? history.back() : (location.hash = '#/home');
                    $('#calPrev').onclick = () => { month--; if (month < 0) { month = 11; year--; } render(); };
                    $('#calNext').onclick = () => { month++; if (month > 11) { month = 0; year++; } render(); };

                    $('#calGrid').addEventListener('click', (e) => {
                        const btn = e.target.closest('.cal-day');
                        if (!btn || btn.disabled) return;
                        const d = parseDate(btn.dataset.date);
                        if (!start || end) { start = d; end = null; }
                        else if (d < start) { end = start; start = d; }
                        else { end = d; }
                        render();
                    });

                    $('#clearDates').onclick = () => { start = end = null; render(); };
                    $('#useDates').onclick = () => {
                        if (!start || !end) return;
                        location.hash = `#/planner?start=${fmt(start)}&end=${fmt(end)}`;
                    };
                    render();
                }
            };
        },

        planner(params) {
            // 沒有 t 參數 = 新行程草稿，按 Save 才會真正建立
            const existing = params.t ? AppState.getTrip(params.t) : null;
            if (params.t && !existing) {
                return { redirect: '#/home' };
            }
            const isNew = !existing;
            const t = existing || normalizeTrip({
                id: uid(), city: '', budget: 100,
                start: params.start || today(),
                end: params.end || fmt(addDays(new Date(), 1))
            });
            const status = tripStatus(t);

            return {
                html: `
                    <section class="center">
                        <div class="detail-hero">
                            <button class="back" id="backFromPlanner" aria-label="Back">←</button>
                            <div class="hero-emoji" aria-hidden="true">${esc(t.emoji)}</div>
                            <h1 class="title">${isNew ? 'New trip' : esc(t.city)}</h1>
                            <p class="subtitle">${isNew ? 'Where are you heading?' : status === 'canceled' ? 'Canceled' : `${nights(t.start, t.end)} night(s) · ${status.charAt(0).toUpperCase() + status.slice(1)}`}</p>
                        </div>

                        <div class="detail-card">
                            ${isNew ? '' : `
                            <div class="chips">
                                <span class="chip">📍 ${esc(t.city)}</span>
                                <span class="chip">📅 ${prettyDate(t.start)} → ${prettyDate(t.end)}</span>
                                <span class="chip">💸 Budget ~ $${t.budget}</span>
                            </div>

                            <div class="actions-row">
                                <button class="btn sm outline" id="openMapFromPlanner">Open Map</button>
                                <button class="btn sm outline" id="shareTripBtn">Share</button>
                                <button class="btn sm outline" id="cancelTripBtn">${t.canceled ? 'Restore trip' : 'Cancel trip'}</button>
                            </div>`}

                            <div class="accordion" id="plannerAcc">
                                ${isNew ? '' : `
                                <div class="acc-item open">
                                    <button class="acc-head" data-acc-toggle aria-expanded="true">
                                        <span>Itinerary & Notes</span>
                                        <span class="arrow" aria-hidden="true">›</span>
                                    </button>
                                    <div class="acc-content">
                                        <p class="notes">${esc(t.notes) || '<span class="muted">Add stops, food, activities…</span>'}</p>
                                    </div>
                                </div>`}

                                <div class="acc-item ${isNew ? 'open' : ''}">
                                    <button class="acc-head" data-acc-toggle aria-expanded="${isNew}">
                                        <span>${isNew ? 'Trip details' : 'Edit Plan'}</span>
                                        <span class="arrow" aria-hidden="true">›</span>
                                    </button>
                                    <div class="acc-content">
                                        <form id="editForm" class="form" autocomplete="off">
                                            <div class="form-group">
                                                <label for="city">Destination</label>
                                                <input id="city" class="input" value="${esc(t.city)}" placeholder="e.g. Brisbane" list="cityList" required />
                                                <datalist id="cityList">${Object.keys(CITY_EMOJI).map(c => `<option value="${c.replace(/\b\w/g, x => x.toUpperCase())}">`).join('')}</datalist>
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

                    const mapBtn = $('#openMapFromPlanner');
                    if (mapBtn) mapBtn.onclick = () => { location.hash = '#/map?q=' + encodeURIComponent(t.city); };

                    const shareBtn = $('#shareTripBtn');
                    if (shareBtn) shareBtn.onclick = async () => {
                        const text = `${t.city}: ${prettyDate(t.start)} → ${prettyDate(t.end)}${t.notes ? '\n' + t.notes : ''}`;
                        try {
                            if (navigator.share) { await navigator.share({ title: `JourneyMate · ${t.city}`, text }); return; }
                            await navigator.clipboard.writeText(text);
                            toast('Trip summary copied!');
                        } catch (err) {
                            if (err && err.name !== 'AbortError') toast('Could not share this trip.');
                        }
                    };

                    const cancelBtn = $('#cancelTripBtn');
                    if (cancelBtn) cancelBtn.onclick = () => {
                        AppState.saveTrip({ ...t, canceled: !t.canceled });
                        toast(t.canceled ? 'Trip restored' : 'Trip canceled');
                        router();
                    };

                    const form = $('#editForm');
                    form.start.onchange = () => {
                        form.end.min = form.start.value;
                        if (form.end.value < form.start.value) form.end.value = form.start.value;
                    };
                    form.onsubmit = (e) => {
                        e.preventDefault();
                        const city = form.city.value.trim() || 'Custom Trip';
                        const updated = normalizeTrip({
                            ...t,
                            city,
                            emoji: city === t.city && !isNew ? t.emoji : emojiFor(city),
                            start: form.start.value,
                            end: form.end.value < form.start.value ? form.start.value : form.end.value,
                            budget: Number(form.budget.value) || 0,
                            notes: form.notes.value.trim()
                        });
                        AppState.saveTrip(updated);
                        toast(isNew ? 'Trip created!' : 'Saved!');
                        if (isNew) location.hash = '#/planner?t=' + encodeURIComponent(updated.id);
                        else router();
                    };

                    if (isNew) form.city.focus();
                }
            };
        },

        profile() {
            const u = AppState.user;
            const name = u.name || (u.email && u.email.split('@')[0]) || 'Traveler';
            const trips = AppState.trips;
            const count = (s) => trips.filter(t => tripStatus(t) === s).length;
            return {
                html: `
                    <section class="center">
                        <div class="profile-hero">
                            <h2 class="hero-title">Profile</h2>
                            <div class="profile-id">
                                <div class="avatar" aria-hidden="true">${esc(name.charAt(0).toUpperCase())}</div>
                                <div>
                                    <p class="profile-name">${esc(name)}</p>
                                    <p class="profile-email">${esc(u.email || '')}</p>
                                </div>
                                <button class="icon-btn" id="editProfileBtn" aria-label="Edit profile">✏️</button>
                            </div>
                        </div>

                        <div class="profile-panel">
                            <div class="card token-card">
                                <div class="token-info">
                                    <div class="token-label">AI Tokens</div>
                                    <div class="token-num" id="tokenBalance">${AppState.tokens}</div>
                                    <div class="token-sub" id="tokenSub"></div>
                                </div>
                                <button class="btn outline" id="claimDailyBtn">Get daily token</button>
                            </div>

                            <div class="stats">
                                <a class="stat" href="#/home?f=upcoming"><b>${count('upcoming')}</b><span>Upcoming</span></a>
                                <a class="stat" href="#/home?f=completed"><b>${count('completed')}</b><span>Completed</span></a>
                                <a class="stat" href="#/home?f=canceled"><b>${count('canceled')}</b><span>Canceled</span></a>
                            </div>

                            <nav class="list">
                                <a class="list-item" href="#/home"><span class="icon">🧳</span><span class="text">My Trips</span><span class="chev">›</span></a>
                                <a class="list-item" href="#" data-soon><span class="icon">💾</span><span class="text">Saved</span><span class="chev">›</span></a>
                                <a class="list-item" href="#" data-soon><span class="icon">📝</span><span class="text">My Reviews</span><span class="chev">›</span></a>
                                <a class="list-item" href="#" data-soon><span class="icon">👛</span><span class="text">Wallet</span><span class="chev">›</span></a>
                                <button class="list-item" id="resetDemo"><span class="icon">♻️</span><span class="text">Reset demo data</span><span class="chev">›</span></button>
                            </nav>

                            <button class="logout-btn" id="logoutBtnInline">Log out</button>
                        </div>
                        ${legal()}
                    </section>
                `,
                bind() {
                    $('#editProfileBtn').onclick = () => {
                        const next = prompt('Display name', name);
                        if (next && next.trim()) {
                            AppState.login(u.email || '', next.trim());
                            router();
                        }
                    };
                    $$('[data-soon]').forEach(a => {
                        a.onclick = (e) => { e.preventDefault(); toast('Coming soon in the full app.'); };
                    });
                    $('#resetDemo').onclick = () => {
                        if (!confirm('Reset all trips to the demo data?')) return;
                        localStorage.removeItem('jm_trips');
                        toast('Demo data restored');
                        router();
                    };
                    $('#logoutBtnInline').onclick = () => { AppState.logout(); location.hash = '#/login'; };
                    wireClaimButton($('#claimDailyBtn'));
                }
            };
        },

        map(params) {
            const q = params.q || (AppState.trips.find(t => tripStatus(t) === 'upcoming') || {}).city || 'Brisbane';
            return {
                html: `
                    <section class="center">
                        <div class="card map-search">
                            <h2 class="title">Map</h2>
                            <p class="kicker">Search places and plan routes</p>
                            <form id="mapForm" class="search-row" role="search">
                                <input id="mapSearch" class="input" placeholder="Search a place" value="${esc(q)}" aria-label="Search a place" />
                                <button class="btn sm" type="submit">Go</button>
                            </form>
                        </div>

                        <div class="map-box" id="mapBox">
                            <iframe id="mapFrame" title="Map" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                            <div class="map-overlay">
                                <button class="loc-btn" id="useLocation">📍 Use my location</button>
                            </div>
                        </div>

                        <div class="actions">
                            <button class="btn outline" id="openExternal">Open in Google Maps</button>
                        </div>
                        ${legal()}
                    </section>
                `,
                bind() {
                    const input = $('#mapSearch');
                    const frame = $('#mapFrame');
                    let query = q;

                    // Google Maps 的 embed 端點不需要 API key
                    const show = () => { frame.src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=13&output=embed`; };
                    const externalURL = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

                    $('#mapForm').onsubmit = (e) => {
                        e.preventDefault();
                        const v = input.value.trim();
                        if (!v) return;
                        query = v;
                        history.replaceState(null, '', '#/map?q=' + encodeURIComponent(v));
                        show();
                    };
                    $('#openExternal').onclick = () => window.open(externalURL(), '_blank', 'noopener');
                    $('#useLocation').onclick = () => {
                        if (!navigator.geolocation) { toast('Your browser does not support geolocation.'); return; }
                        toast('Finding you…');
                        navigator.geolocation.getCurrentPosition(
                            (pos) => {
                                query = `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
                                input.value = 'My location';
                                show();
                            },
                            (err) => toast('Unable to get location: ' + err.message),
                            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
                        );
                    };
                    show();
                }
            };
        }
    };

    /* ================= AI assistant ================= */

    function aiSuggestionsFor(t) {
        const city = t ? t.city : 'your city';
        return [
            { chip: 'Weather', text: `Showers are possible in ${city}. Keep an indoor option such as a museum or gallery in your plan.`, apply: 'Rainy-day backup: museum / gallery visit' },
            { chip: 'Traffic', text: 'Traffic usually peaks around 5pm. Consider an earlier dinner close to where you are staying.', apply: 'Dinner 17:00 near accommodation' },
            { chip: 'Budget', text: `Your budget is ~$${t ? t.budget : 100}/day. Public transport day passes can save around 30% compared to rideshare.`, apply: 'Use a public transport day pass' },
            { chip: 'Timing', text: `Popular spots in ${city} are quieter before 10am. Put the busiest attraction first.`, apply: 'Visit the most popular attraction before 10am' },
            { chip: 'Local', text: `Check for weekend markets in ${city}. They are a cheap way to try local food.`, apply: 'Weekend local market for lunch' }
        ];
    }

    let aiIndex = Math.floor(Math.random() * 5);

    function aiTargetTrip() {
        const params = currentParams();
        if (currentRoute() === '#/planner' && params.t) {
            const t = AppState.getTrip(params.t);
            if (t) return t;
        }
        return AppState.trips.filter(t => tripStatus(t) === 'upcoming').sort((a, b) => a.start.localeCompare(b.start))[0] || null;
    }

    function renderAi() {
        const panel = $('#aiPanel');
        const box = $('#aiSuggestions');
        const target = aiTargetTrip();
        const list = aiSuggestionsFor(target);
        const s = list[aiIndex % list.length];

        box.innerHTML = `
            <div class="ai-card">
                <div class="ai-row">
                    <span class="ai-chip">${esc(s.chip)}</span>
                    <div class="ai-text">${esc(s.text)}</div>
                </div>
                <div class="ai-target">${target ? `Applies to: <b>${esc(target.city)}</b>` : 'Create a trip to apply suggestions.'}</div>
                <div class="ai-actions">
                    <button class="btn outline" id="aiNext">Another idea</button>
                    <button class="btn" id="aiApply" ${target && AppState.tokens > 0 ? '' : 'disabled'}>Apply (🪙1)</button>
                </div>
            </div>
        `;
        $('#aiWalletCount').textContent = String(AppState.tokens);
        const can = AppState.canClaimDaily();
        const claim = $('#aiClaimBtn');
        if (!claim.dataset.busy) {
            claim.disabled = !can;
            claim.textContent = can ? 'Get daily token (+1)' : 'Come back tomorrow';
        }

        $('#aiNext').onclick = () => { aiIndex++; renderAi(); };
        $('#aiApply').onclick = () => {
            if (!target) return;
            if (!AppState.consumeToken(1)) { toast('Not enough tokens. Claim your daily token first.'); return; }
            const line = `AI • ${s.apply}`;
            const ta = $('#notes');
            if (currentRoute() === '#/planner' && ta) {
                // 在 planner 頁：同時寫入表單與儲存
                ta.value = (ta.value ? ta.value + '\n' : '') + line;
            }
            const fresh = AppState.getTrip(target.id);
            AppState.saveTrip({ ...fresh, notes: (fresh.notes ? fresh.notes + '\n' : '') + line });
            toast(`Added to ${target.city}`);
            closeAi();
            $('#aiFab .dot')?.remove();
            aiIndex++;
            if (currentRoute() === '#/planner' || currentRoute() === '#/profile') router();
        };
    }

    function openAi() {
        renderAi();
        $('#aiPanel').hidden = false;
        $('#aiPanel').classList.add('show');
        $('#aiFab').setAttribute('aria-expanded', 'true');
    }
    function closeAi() {
        $('#aiPanel').classList.remove('show');
        $('#aiPanel').hidden = true;
        $('#aiFab').setAttribute('aria-expanded', 'false');
    }

    // 模擬「看廣告」拿每日 token；profile 與 AI 面板共用
    function wireClaimButton(btn, onDone) {
        const refresh = () => {
            const can = AppState.canClaimDaily();
            if (!btn.dataset.busy) {
                btn.disabled = !can;
                btn.textContent = can ? btn.dataset.label : 'Come back tomorrow';
            }
            const bal = $('#tokenBalance'); if (bal) bal.textContent = String(AppState.tokens);
            const sub = $('#tokenSub'); if (sub) sub.textContent = can ? 'Daily reward available' : 'Next reward tomorrow';
            $('#aiWalletCount').textContent = String(AppState.tokens);
        };
        btn.dataset.label = btn.dataset.label || btn.textContent;
        refresh();
        btn.onclick = async () => {
            if (!AppState.canClaimDaily() || btn.dataset.busy) return;
            btn.dataset.busy = '1';
            btn.disabled = true;
            btn.textContent = 'Watching ad…';
            await new Promise(r => setTimeout(r, 1200));
            delete btn.dataset.busy;
            if (AppState.claimDaily()) toast('🪙 Token +1');
            refresh();
            if (onDone) onDone();
        };
    }

    function initAi() {
        $('#aiFab').onclick = () => ($('#aiPanel').classList.contains('show') ? closeAi() : openAi());
        $('#aiClose').onclick = closeAi;
        wireClaimButton($('#aiClaimBtn'), renderAi);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAi(); });
    }

    /* ================= Router ================= */

    const ROUTES = {
        '#/login':   { view: Views.login,   auth: false },
        '#/signup':  { view: Views.signup,  auth: false },
        '#/home':    { view: Views.home,    auth: true },
        '#/dates':   { view: Views.dates,   auth: true },
        '#/planner': { view: Views.planner, auth: true },
        '#/profile': { view: Views.profile, auth: true },
        '#/map':     { view: Views.map,     auth: true }
    };

    function router() {
        const path = currentRoute();
        const route = ROUTES[path];
        const authed = AppState.isAuthed;

        if (!route) { location.replace(authed ? '#/home' : '#/login'); return; }
        if (route.auth && !authed) { location.replace('#/login'); return; }
        if (!route.auth && authed) { location.replace('#/home'); return; }

        const view = route.view(currentParams());
        if (view.redirect) { location.replace(view.redirect); return; }

        document.body.classList.toggle('auth', !route.auth);
        $('#bottomNav').hidden = !route.auth;
        $('#aiFab').hidden = !route.auth;
        closeAi();

        const root = $('#appRoot');
        root.innerHTML = view.html;
        root.scrollTop = 0;
        view.bind();

        $$('#bottomNav .tab').forEach(b => {
            const on = b.dataset.match.split(' ').includes(path);
            b.classList.toggle('active', on);
            if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        });

        const titles = { '#/home': 'MyJourney', '#/dates': 'Select dates', '#/planner': 'Planner', '#/profile': 'Profile', '#/map': 'Map', '#/signup': 'Sign up', '#/login': 'Sign in' };
        document.title = `${titles[path]} · JourneyMate`;
    }

    function initNav() {
        $$('#bottomNav .tab').forEach(btn => {
            btn.onclick = () => { location.hash = btn.dataset.route; };
        });
        $('#fabNewPlan').onclick = () => { location.hash = '#/dates'; };
    }

    window.addEventListener('hashchange', router);
    window.addEventListener('DOMContentLoaded', () => {
        initNav();
        initAi();
        router();
    });
})();
