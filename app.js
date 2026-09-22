/* JourneyMate Prototype App (vanilla JS SPA)
   - Keeps CSS/JS in separate files (per Steven's preference)
   - Four-space indentation
*/
(function () {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const AppState = {
        get isAuthed() {
            return Boolean(localStorage.getItem('jm_user'));
        },
        login(email) {
            localStorage.setItem('jm_user', JSON.stringify({ email }));
        },
        logout() {
            localStorage.removeItem('jm_user');
        },
        get user() {
            try { return JSON.parse(localStorage.getItem('jm_user') || '{}'); }
            catch (_) { return {}; }
        },
        get tokens(){ return Number(localStorage.getItem('jm_tokens') || '0'); },
        set tokens(v){ localStorage.setItem('jm_tokens', String(Math.max(0, v|0))); },
        get lastClaim(){ return localStorage.getItem('jm_last_claim') || ''; },
        set lastClaim(d){ localStorage.setItem('jm_last_claim', d); },
        canClaimDaily(){
            const today = new Date().toISOString().slice(0,10);
            return this.lastClaim !== today;
        },
        claimDaily(){
            if (!this.canClaimDaily()) return false;
            this.tokens = this.tokens + 1;
            this.lastClaim = new Date().toISOString().slice(0,10);
            return true;
        },
        consumeToken(n=1){
            if (this.tokens >= n) { this.tokens = this.tokens - n; return true; }
            return false;
        },
        trips: [
            { id: 't1', city: 'Brisbane', start:'2025-10-05', end:'2025-10-07', budget: 120, notes: 'South Bank • QAGOMA • CityCat' },
            { id: 't2', city: 'Gold Coast', start:'2025-10-22', end:'2025-10-26', budget: 180, notes: 'Surf & Theme Parks' },
            { id: 't3', city: 'Sunshine Coast', start:'2025-11-03', end:'2025-11-05', budget: 150, notes: 'Noosa National Park' }
        ]
    };

    const Views = {
        login() {
            const tpl = `
                <section class="card center" aria-labelledby="loginTitle">
                    <div class="brand">
                        <div class="brand-logo">
                            <img src="assets/logo2.png" alt="JourneyMate logo">
                        </div>
                        <h1 class="brand-title">JourneyMate</h1>
                        <p class="brand-sub">Plan less, experience more</p>
                    </div>
        
                    <h2 class="title" id="loginTitle">Sign in</h2>
        
                    <form id="loginForm" autocomplete="on">
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input id="email" name="email" class="input" type="email" placeholder="your.email@example.com" required />
                        </div>
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input id="password" name="password" class="input" type="password" placeholder="••••••••" required minlength="4"/>
                        </div>
                        <button class="btn" type="submit">Sign In</button>
                    </form>
        
                    <div class="actions row two">
                        <button class="btn outline" id="googleBtn">Continue with Google</button>
                        <button class="btn outline" id="fbBtn">Continue with Facebook</button>
                    </div>
        
                    <p class="helper">
                        <a href="#" class="link" id="forgotLink">Forgot Password?</a>
                    </p>
                    <hr class="soft"/>
                    <p class="helper">
                        Don't have an account?
                        <a href="#/signup" class="link">Sign Up</a>
                    </p>
                    <p class="helper legal">
                        © ${new Date().getFullYear()} JourneyMate (Prototype)
                    </p>
                </section>
            `;
            return tpl;
        },
        

        signup() {
            const tpl = `
                <section class="card center" aria-labelledby="signupTitle">
                    <h2 class="title" id="signupTitle">Create account</h2>
                    <p class="kicker">Takes less than a minute.</p>
                    <form id="signupForm">
                        <div class="row two">
                            <div class="form-group">
                                <label for="name">Name</label>
                                <input id="name" class="input" placeholder="Ada Lovelace" required />
                            </div>
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input id="email" type="email" class="input" placeholder="you@example.com" required />
                            </div>
                        </div>
                        <div class="row two">
                            <div class="form-group">
                                <label for="password">Password</label>
                                <input id="password" type="password" class="input" placeholder="Create a password" minlength="4" required />
                            </div>
                            <div class="form-group">
                                <label for="confirm">Confirm</label>
                                <input id="confirm" type="password" class="input" placeholder="Repeat password" minlength="4" required />
                            </div>
                        </div>
                        <button class="btn" type="submit">Create account</button>
                        <p class="helper" style="margin-top:12px;">
                            Already have an account? <a class="link" href="#/login">Sign in</a>
                        </p>
                    </form>
                    <p class="helper legal">
                        © ${new Date().getFullYear()} JourneyMate (Prototype)
                    </p>
                </section>
            `;
            return tpl;
        },

        home() {
            // 小工具：拿到起訖日期 + 狀態
            const tripDates = (t) => {
                const start = t.start || t.date || "";
                const end   = t.end   || t.date || "";
                return { start, end };
            };
            const tripStatus = (t) => {
                if (t.canceled) return "canceled";
                const { start, end } = tripDates(t);
                const today = new Date().toISOString().slice(0,10);
                if (end && end < today) return "completed";
                return "upcoming";
            };
            // 一張卡片的 HTML
            const card = (t) => {
                const { start, end } = tripDates(t);
                const title = t.title || t.city || "Trip";
                const emoji = t.emoji || "📍";
                return `
                    <article class="trip-card" data-id="${t.id}">
                        <div class="trip-thumb">${emoji}</div>
                        <div class="trip-main">
                            <div class="trip-title">${title}</div>
                            <div class="trip-dates">
                                <div><span class="muted">Check In</span><strong>${start || "-"}</strong></div>
                                <div><span class="muted">Check Out</span><strong>${end   || "-"}</strong></div>
                            </div>
                            <div class="trip-cta">
                                <button class="pill" data-action="view" data-id="${t.id}">VIEW DETAILS</button>
                            </div>
                        </div>
                        <button class="card-x" title="Remove" data-action="delete" data-id="${t.id}">×</button>
                    </article>
                `;
            };
        
            // 初始過濾：Upcoming
            const initial = AppState.trips.filter(t => tripStatus(t) === "upcoming")
                                            .map(card).join("") || `<p class="helper">No upcoming trips.</p>`;
        
            return `
                <section class="center">
                <div class="topbar">
                    <div class="topbar-title">MyJourney</div>
                    <button class="topbar-btn" id="newTripBtn" aria-label="Add">＋</button>
                </div>
        
                <div class="segmented">
                    <button class="seg active" data-filter="upcoming">Upcoming</button>
                    <button class="seg" data-filter="completed">Completed</button>
                    <button class="seg" data-filter="canceled">Canceled</button>
                </div>
        
                <div id="tripList" class="trip-list">
                    ${initial}
                </div>
                </section>
            `;
        },
        

        dates() {
            const today = new Date();
            const tpl = `
                <section class="center">
                    <div class="calendar" id="dateRangeView" data-year="${today.getFullYear()}" data-month="${today.getMonth()}">
                        <div class="cal-header">
                            <button class="nav-btn" data-route="#/home" aria-label="Back">←</button>
                            <div class="cal-title">Select travel dates</div>
                            <div class="cal-nav">
                                <button id="calPrev" aria-label="Previous month">‹</button>
                                <button id="calNext" aria-label="Next month">›</button>
                            </div>
                        </div>
        
                        <div class="cal-weekdays">${WEEKDAYS.map(w=>`<span>${w}</span>`).join("")}</div>
                        <div class="cal-month h6" id="calMonth" style="margin:8px 0; color:var(--muted);">${MONTHS[today.getMonth()]} ${today.getFullYear()}</div>
                        <div class="cal-grid" id="calGrid"></div>
        
                        <div class="actions row two">
                            <button class="btn outline" id="clearDates">Clear</button>
                            <button class="btn" id="useDates">Use dates</button>
                        </div>
                    </div>
                </section>
            `;
            return tpl;
        },
        

        planner(params) {
            // 取得資料 & 日期
            const t = AppState.trips.find(x => x.id === params.t) || { city: "Custom Trip", date: "", budget: 0, notes: "" };
            let start = params.start || "", end = params.end || "";
            if (!start || !end) {
                if (t.date && t.date.includes("~")) {
                    const [s, e] = t.date.split("~").map(s => s.trim());
                    start = start || s; end = end || e;
                }
            }
        
            return `
                <section class="center">
                    <!-- 上方 Hero -->
                    <div class="detail-hero">
                        <button class="back" id="backFromPlanner" aria-label="Back">←</button>
                        <h1 class="title">${t.city}</h1>
                        <p class="subtitle">Quick editable plan</p>
                    </div>
        
                    <!-- 白卡：關鍵資訊 + 快捷操作 -->
                    <div class="detail-card">
                        <div class="chips">
                            <span class="chip">📍 ${t.city}</span>
                            ${start ? `<span class="chip">📅 Check In&nbsp; ${start}</span>` : ``}
                            ${end   ? `<span class="chip">📅 Check Out&nbsp; ${end}</span>` : ``}
                            <span class="chip">💸 Budget ~ $${t.budget || 0}</span>
                        </div>
        
                        <div class="actions-row">
                            <button class="btn sm outline" id="openMapFromPlanner">Open Map</button>
                            <button class="btn sm outline" id="shareTripBtn">Share</button>
                        </div>
        
                        <!-- 手風琴區塊 -->
                        <div class="accordion" id="plannerAcc">
                            <div class="acc-item open">
                                <header data-acc-toggle>
                                    <span>Itinerary & Notes</span>
                                    <span class="arrow">›</span>
                                </header>
                                <div class="acc-content">
                                    <p style="margin:6px 0 10px;">${t.notes || "Add stops, food, activities…"}</p>
                                </div>
                            </div>
        
                            <div class="acc-item">
                                <header data-acc-toggle>
                                    <span>Edit Plan</span>
                                    <span class="arrow">›</span>
                                </header>
                                <div class="acc-content">
                                    <form id="editForm" class="form" autocomplete="off">
                                        <div class="form-group">
                                            <label for="city">Destination</label>
                                            <input id="city" class="input" value="${t.city}" />
                                        </div>
                                        <div class="row two">
                                            <div class="form-group">
                                                <label for="start">Start date</label>
                                                <input id="start" type="date" class="input" value="${start || ''}" />
                                            </div>
                                            <div class="form-group">
                                                <label for="end">End date</label>
                                                <input id="end" type="date" class="input" value="${end || ''}" />
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label for="notes">Notes</label>
                                            <textarea id="notes" class="input" rows="3" placeholder="Add stops, food, activities...">${t.notes || ''}</textarea>
                                        </div>
                                        <div class="detail-cta">
                                            <button class="btn" type="submit">Save changes</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
        
                            <div class="acc-item">
                                <header data-acc-toggle>
                                    <span>Location</span>
                                    <span class="arrow">›</span>
                                </header>
                                <div class="acc-content">
                                    <p style="margin:6px 0;">Open map to see nearby places and routes.</p>
                                    <button class="btn outline" id="openMapInside">Open Map</button>
                                </div>
                            </div>
                        </div>
                    </div>
        
                    <p class="legal-global">© ${new Date().getFullYear()} JourneyMate (Prototype)</p>
                </section>
            `;
        },        

        profile() {
            const u = AppState.user;
            const name = (u.email && u.email.split('@')[0]) || 'Traveler';
            return `
                <section class="center">
                    <div class="profile-hero">
                        <h2 class="hero-title">Profile</h2>
                        <div class="profile-id">
                            <div class="avatar">
                                <img src="assets/avatar.png" alt="Avatar" onerror="this.style.display='none'">
                            </div>
                            <div>
                                <p class="profile-name">${name}</p>
                                <p class="profile-email">${u.email || ''}</p>
                            </div>
                            <button class="icon-btn" id="editProfileBtn" aria-label="Edit profile">✏️</button>
                        </div>
                    </div>
        
                    <div class="profile-panel">
                        <!-- AI Token 卡片（獨立 card，不要塞在 .list 裡） -->
                        <div class="card token-card" id="tokenCard">
                            <div class="token-info">
                                <div class="token-label">AI Tokens</div>
                                <div class="token-num"><span id="tokenBalance">${AppState.tokens}</span></div>
                                <div class="token-sub">${AppState.canClaimDaily() ? 'Daily reward available' : 'Come back tomorrow'}</div>
                            </div>
                            <button class="btn outline" id="claimDailyBtn" style="width:auto">Get daily token</button>
                        </div>
        
                        <nav class="list">
                            <a class="list-item" href="#/home">
                                <span class="icon">🧳</span>
                                <span class="text">My Trips</span>
                                <span class="chev">›</span>
                            </a>
                            <a class="list-item" href="#"><span class="icon">💾</span><span class="text">Saved</span><span class="chev">›</span></a>
                            <a class="list-item" href="#"><span class="icon">📝</span><span class="text">My Reviews</span><span class="chev">›</span></a>
                            <a class="list-item" href="#"><span class="icon">👛</span><span class="text">Wallet</span><span class="chev">›</span></a>
                            <a class="list-item" href="#"><span class="icon">⚙️</span><span class="text">Settings</span><span class="chev">›</span></a>
                            <a class="list-item" href="#"><span class="icon">❓</span><span class="text">Help</span><span class="chev">›</span></a>
                        </nav>
        
                        <button class="logout-btn" id="logoutBtnInline">Logout</button>
                    </div>
                </section>
            `;
        },
         
        
        map() {
            return `
                <section class="center">
                    <div class="card" style="margin-bottom:12px;">
                        <h2 class="title" style="margin:0 0 6px;">Map</h2>
                        <p class="kicker">Search places and plan routes</p>
                        <div class="form-group" style="margin:0;">
                            <input id="mapSearch" class="input" placeholder="Search (prototype)" />
                        </div>
                    </div>
        
                    <div class="map-box" id="mapBox">
                        <!-- 這裡先放視覺用的假地圖 -->
                        <div class="map-overlay">
                            <button class="loc-btn" id="useLocation">Use my location</button>
                        </div>
                    </div>
        
                    <div class="actions" style="margin-top:12px;">
                        <button class="btn outline" id="openExternal">Open in Google Maps</button>
                    </div>
                </section>
            `;
        },
    };

    function parseQuery(str = "") {
        const out = {};
        str.replace(/^[?#]/, '').split('&').forEach(pair => {
            if (!pair) return;
            const [k, v] = pair.split('=');
            out[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
        return out;
    }

    function currentRoute(){ return (location.hash || '#/login').split('?')[0]; }
    function currentParams(){ return parseQuery((location.hash.split('?')[1] || '')); }

    function setAuthMode(isAuth) {
        document.body.classList.toggle('auth', isAuth);
    }

    function mount(html) {
        const root = document.getElementById('appRoot');
        root.innerHTML = html;
    
        const yearEl = document.getElementById('year');
        if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    
        try {
        ensureAiWidget();
        } catch (err) {
        console.warn('[AI widget] init failed:', err);
        }
    
        wireGlobalNav();
    }

    function fmt(d){ const m = d.getMonth()+1, day=d.getDate(); return `${d.getFullYear()}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`; }
    function sameDay(a,b){ return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
    function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
    function monthCells(y,m){
        // 6 週 * 7 天 = 42 格，從當月第一天所在週的星期日開始
        const first = new Date(y,m,1);
        const start = addDays(first, -first.getDay()); // 週日
        return Array.from({length:42}, (_,i)=> addDays(start, i));
    }
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];


    function wireGlobalNav() {
        const authed = AppState.isAuthed;
    
        // 手機底部導覽：登入後出現，未登入隱藏
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) bottomNav.hidden = !authed;
        if (!authed) return;
    
        // 點擊切換頁面
        $$('#bottomNav .tab').forEach(btn => {
            const r = btn.getAttribute('data-route');
            if (r) btn.onclick = () => { location.hash = r; };
        });
    
        // 登出
        const logoutTab = document.getElementById('logoutTab');
        if (logoutTab) logoutTab.onclick = () => { AppState.logout(); location.hash = '#/login'; };
    
        // 新增行程 FAB
        const fab = document.getElementById('fabNewPlan');
        if (fab) {
            fab.onclick = () => {
                const id = 't' + Math.random().toString(36).slice(2,7);
                AppState.trips.unshift({
                    id,
                    city: 'Custom Trip',
                    date: new Date().toISOString().slice(0,10),
                    budget: 100,
                    notes: 'Tap "Plan" to edit.'
                });
                location.hash = '#/planner?t=' + id;
            };
        }
    
        // 高亮目前分頁
        const current = location.hash.split('?')[0];
        $$('#bottomNav .tab').forEach(b => b.classList.toggle('active', b.getAttribute('data-route') === current));
    }

    function ensureAiWidget(){
        // 找到手機殼；找不到就退回 body
        const host = document.querySelector('.phone-shell') || document.body;
    
        // 已存在就沿用
        let fab   = host.querySelector('#aiFab');
        let panel = host.querySelector('#aiPanel');
    
        if (!fab) {
            fab = document.createElement('button');
            fab.id = 'aiFab';
            fab.className = 'ai-fab';
            fab.setAttribute('aria-label', 'AI suggestions');
            fab.innerHTML = '🤖<span class="dot" aria-hidden="true"></span>';
            host.appendChild(fab);
        }
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'aiPanel';
            panel.className = 'ai-panel';
            panel.innerHTML = `
                <div class="ai-head">
                    <div class="ai-title">AI suggestion</div>
                    <div class="ai-wallet">🪙 <b id="aiWalletCount">0</b></div>
                    <button class="ai-close" id="aiClose" aria-label="Close">✕</button>
                </div>
                <div id="aiSuggestions"></div>
                <div class="ai-foot">
                    <button class="btn outline" id="aiClaimBtn">Get daily token (+1)</button>
                </div>
            `;
            host.appendChild(panel);
        }
    
        // 顯示/關閉
        fab.onclick = () => panel.classList.toggle('show');
        panel.querySelector('#aiClose').onclick = () => panel.classList.remove('show');
    
        // 更新建議內容
        renderAiSuggestions(panel);
    
        function updateAiWalletUI(){
            const n = AppState.tokens;
            const can = AppState.canClaimDaily();
            const walletEl = panel.querySelector('#aiWalletCount');
            if (walletEl) walletEl.textContent = String(n);
            const claimBtn = panel.querySelector('#aiClaimBtn');
            if (claimBtn){
                claimBtn.disabled = !can;
                claimBtn.textContent = can ? 'Get daily token (+1)' : 'Come back tomorrow';
            }
            const applyBtn = panel.querySelector('#aiApply');
            if (applyBtn) applyBtn.disabled = n <= 0;
        }
        updateAiWalletUI();
        
        panel.querySelector('#aiClaimBtn').onclick = async () => {
            const btn = panel.querySelector('#aiClaimBtn');
            if (!btn || btn.disabled) return;
            // 模擬「看廣告」1.5 秒
            btn.disabled = true; btn.textContent = 'Watching ad…';
            await new Promise(r => setTimeout(r, 1500));
            if (AppState.claimDaily()){
                alert('Token +1');
            }
            updateAiWalletUI();
        };

        // 未登入頁隱藏
        const isAuthPage = document.body.classList.contains('auth');
        fab.hidden = isAuthPage;
        panel.hidden = isAuthPage;
    }
    
    
    /** 簡單生成一個建議卡（原型版） */
    function renderAiSuggestions(panel){
        const box = panel.querySelector('#aiSuggestions');
        const route = currentRoute();
        const params = currentParams();
        const applyBtn = panel.querySelector('#aiApply');
        if (applyBtn) applyBtn.disabled = AppState.tokens <= 0;

        panel.querySelector('#aiApply').onclick = () => {
            if (!AppState.consumeToken(1)){
                alert('Not enough tokens. Claim your daily token first.');
                return;
            }
            // === 下面保留你原本的「套用建議」邏輯 ===
            if (currentRoute() === '#/planner') {
                const ta = document.getElementById('notes');
                if (ta) ta.value = (ta.value ? ta.value + '\n' : '') + `AI • ${s.apply}`;
            } else {
                const idx = tripIdx;
                const t = AppState.trips[idx];
                AppState.trips[idx] = { ...t, notes: (t.notes ? t.notes + ' • ' : '') + `AI: ${s.apply}` };
                alert('Applied to your trip notes!');
            }
            panel.classList.remove('show');
            const dot = document.querySelector('#aiFab .dot'); if (dot) dot.remove();

            // 更新錢包顯示
            const w = document.getElementById('aiWalletCount');
            if (w) w.textContent = String(AppState.tokens);
        };

        // 決定要作用到哪個 trip
        let tripIdx = -1;
        if (route === '#/planner' && params.t) {
            tripIdx = AppState.trips.findIndex(x => x.id === params.t);
        }
        if (tripIdx < 0) tripIdx = 0; // fallback: 第一個
    
        const target = AppState.trips[tripIdx] || { city:'your city', notes:'' };
    
        // Demo：根據今天/假裝天氣給一個建議文字
        const suggestions = [
            {
                chip: 'Weather',
                text: `It may rain in ${target.city}. Consider visiting Queensland Museum instead of outdoor.`,
                apply: `Museum visit (indoor) • South Brisbane`
            },
            {
                chip: 'Traffic',
                text: `Traffic peak expected at 5pm. Move dinner earlier or dine near accommodation.`,
                apply: `Dinner 17:00 near hotel`
            }
        ];
        const s = suggestions[Math.floor(Math.random()*suggestions.length)];
    
        box.innerHTML = `
            <div class="ai-card">
                <div class="ai-row">
                    <span class="ai-chip">${s.chip}</span>
                    <div class="ai-text">${s.text}</div>
                </div>
                <div class="ai-actions">
                    <button class="btn outline" id="aiDismiss">Dismiss</button>
                    <button class="btn" id="aiApply">Apply Suggestion</button>
                </div>
            </div>
        `;
    
        panel.querySelector('#aiDismiss').onclick = () => {
            panel.classList.remove('show');
        };
    
        panel.querySelector('#aiApply').onclick = () => {
            // 若在 planner 頁：直接把建議寫進 Notes 欄位；否則寫進該 trip 的 notes 並回到 MyJourney
            if (currentRoute() === '#/planner') {
                const ta = document.getElementById('notes');
                if (ta) {
                    ta.value = (ta.value ? ta.value + '\n' : '') + `AI • ${s.apply}`;
                }
            } else {
                const idx = tripIdx;
                const t = AppState.trips[idx];
                AppState.trips[idx] = { ...t, notes: (t.notes ? t.notes + ' • ' : '') + `AI: ${s.apply}` };
                alert('Applied to your trip notes!');
            }
            panel.classList.remove('show');
            // 小紅點移除
            const dot = document.querySelector('#aiFab .dot');
            if (dot) dot.remove();
        };
    }

    function requireAuth(nextHash) {
        if (!AppState.isAuthed) {
            location.hash = '#/login';
            return false;
        }
        return true;
    }

    function handleActions() {
        // Login view actions
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = loginForm.email.value.trim();
                const pwd = loginForm.password.value.trim();
                if (!email || !pwd) return;
                AppState.login(email);
                location.hash = '#/home';
            });
            const forgot = document.getElementById('forgotLink');
            if (forgot) forgot.onclick = (e) => {
                e.preventDefault();
                alert('Demo: password reset link sent to your email (not really).');
            };
            const g = document.getElementById('googleBtn');
            const f = document.getElementById('fbBtn');
            [g, f].forEach(btn => btn && (btn.onclick = () => alert('Social sign-in is mocked in this prototype.')));
            return;
        }

        // Signup view
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = signupForm.email.value.trim();
                const pwd = signupForm.password.value.trim();
                const cf = signupForm.confirm.value.trim();
                if (pwd !== cf) {
                    alert('Passwords do not match.');
                    return;
                }
                AppState.login(email);
                location.hash = '#/home';
            });
            return;
        }

        // Home view
        const listEl = document.getElementById('tripList');
        if (listEl) {
            // 和上面 Views.home 同樣的小工具（給事件使用）
            const tripDates = (t) => ({ start: t.start || t.date || "", end: t.end || t.date || "" });
            const tripStatus = (t) => {
                if (t.canceled) return "canceled";
                const { start, end } = tripDates(t);
                const today = new Date().toISOString().slice(0,10);
                if (end && end < today) return "completed";
                return "upcoming";
            };
            const card = (t) => {
                const { start, end } = tripDates(t);
                const title = t.title || t.city || "Trip";
                const emoji = t.emoji || "📍";
                return `
                    <article class="trip-card" data-id="${t.id}">
                        <div class="trip-thumb">${emoji}</div>
                        <div class="trip-main">
                            <div class="trip-title">${title}</div>
                            <div class="trip-dates">
                                <div><span class="muted">Check In</span><strong>${start || "-"}</strong></div>
                                <div><span class="muted">Check Out</span><strong>${end || "-"}</strong></div>
                            </div>
                            <div class="trip-cta">
                                <button class="pill" data-action="view" data-id="${t.id}">VIEW DETAILS</button>
                            </div>
                        </div>
                        <button class="card-x" title="Remove" data-action="delete" data-id="${t.id}">×</button>
                    </article>
                `;
            };

            // 渲染器 + 分段控制
            const segs = $$('.segmented .seg');
            let currentFilter = 'upcoming';
            function render(filter) {
                const html = AppState.trips.filter(t => tripStatus(t) === filter).map(card).join('');
                listEl.innerHTML = html || `<p class="helper">No ${filter} trips.</p>`;
            }
            segs.forEach(btn => {
                btn.onclick = () => {
                    segs.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentFilter = btn.dataset.filter;
                    render(currentFilter);
                };
            });

            // 事件委派：view / delete
            listEl.addEventListener('click', (e) => {
                const id = e.target.closest('.trip-card')?.dataset.id;
                if (!id) return;

                if (e.target.closest('[data-action="view"]')) {
                    const t = AppState.trips.find(x => x.id === id);
                    const { start, end } = tripDates(t);
                    location.hash = `#/planner?t=${id}&start=${start}&end=${end}`;
                    return;
                }
                if (e.target.closest('[data-action="delete"]')) {
                    AppState.trips = AppState.trips.filter(x => x.id !== id);
                    render(currentFilter);
                    return;
                }
            });

            // 右上 + 建立新行程
            const newBtn = document.getElementById('newTripBtn');
            if (newBtn) {
                newBtn.onclick = () => {
                    const id = 't' + Math.random().toString(36).slice(2,7);
                    const today = new Date();
                    const start = today.toISOString().slice(0,10);
                    const end = new Date(today.getTime()+86400000).toISOString().slice(0,10);
                    AppState.trips.unshift({
                        id, city: 'Custom Trip', start, end, emoji:'🗺️',
                        notes: 'Tap "View details" to edit.'
                    });
                    location.hash = `#/planner?t=${id}&start=${start}&end=${end}`;
                };
            }

            // 初次渲染
            render(currentFilter);
            return;
        }


        // Planner view
        const acc = document.getElementById('plannerAcc');
        if (acc) {
            // 手風琴
            acc.querySelectorAll('[data-acc-toggle]').forEach(h => {
                h.onclick = () => h.parentElement.classList.toggle('open');
            });

            // 返回
            const back = document.getElementById('backFromPlanner');
            if (back) back.onclick = () => { location.hash = '#/home'; };

            // 地圖
            const openMap1 = document.getElementById('openMapFromPlanner');
            const openMap2 = document.getElementById('openMapInside');
            [openMap1, openMap2].forEach(btn => btn && (btn.onclick = () => location.hash = '#/map'));

            // Share
            const shareBtn = document.getElementById('shareTripBtn');
            if (shareBtn) {
                shareBtn.onclick = async () => {
                    const url = location.href;
                    try { await navigator.clipboard.writeText(url); alert('Share link copied!'); }
                    catch { alert('Link: ' + url); }
                };
            }

            // 編輯表單
            const form = document.getElementById('editForm');
            if (form) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const params = parseQuery(location.hash.split('?')[1] || '');
                    const idx = AppState.trips.findIndex(x => x.id === params.t);
                    const updated = {
                        id: params.t || ('t' + Math.random().toString(36).slice(2,7)),
                        city: form.city.value.trim() || 'Custom Trip',
                        date: (form.start.value || '') + (form.end.value ? ' ~ ' + form.end.value : ''),
                        budget: (idx >= 0 ? AppState.trips[idx].budget : 0),
                        notes: form.notes.value.trim()
                    };
                    if (idx >= 0) AppState.trips[idx] = updated;
                    else AppState.trips.unshift(updated);
                    alert('Saved!');
                    location.hash = '#/home';
                };
            }
            return;
        }


        // Profile
        const editBtn       = document.getElementById('editProfileBtn');
        const logoutInline  = document.getElementById('logoutBtnInline');
        const claimDailyBtn = document.getElementById('claimDailyBtn');
        const balEl         = document.getElementById('tokenBalance');

        if (editBtn || logoutInline || claimDailyBtn) {   // ← 一定要把 claimDailyBtn 也放進條件
            if (editBtn) {
                editBtn.onclick = () => alert('Prototype: edit profile coming soon.');
            }
            if (logoutInline) {
                logoutInline.onclick = () => { AppState.logout(); location.hash = '#/login'; };
            }
            if (claimDailyBtn) {
                const refresh = () => {
                    if (balEl) balEl.textContent = String(AppState.tokens);
                    const can = AppState.canClaimDaily();
                    claimDailyBtn.disabled = !can;
                    claimDailyBtn.textContent = can ? 'Get daily token' : 'Come back tomorrow';
                    // （可選）同步 AI 面板的錢包與按鈕狀態
                    const w = document.getElementById('aiWalletCount');
                    if (w) w.textContent = String(AppState.tokens);
                    const applyBtn = document.getElementById('aiApply');
                    if (applyBtn) applyBtn.disabled = AppState.tokens <= 0;
                };
                refresh();

                claimDailyBtn.onclick = async () => {
                    if (!AppState.canClaimDaily()) return;
                    claimDailyBtn.disabled = true;
                    claimDailyBtn.textContent = 'Watching ad…';
                    await new Promise(r => setTimeout(r, 1200)); // 模擬觀看廣告
                    if (AppState.claimDaily()) alert('Token +1');
                    refresh();
                };
            }
            return;
        }



        // Date range view
        const view = document.getElementById('dateRangeView');
        if (view) {
            let year = Number(view.dataset.year);
            let month = Number(view.dataset.month); // 0-11
            let start = null, end = null;

            const $month = document.getElementById('calMonth');
            const $grid = document.getElementById('calGrid');

            function render(){
                $month.textContent = `${MONTHS[month]} ${year}`;
                const cells = monthCells(year, month).map(d=>{
                    const inMonth = d.getMonth() === month;
                    const classes = ["cal-day"];
                    if (!inMonth) classes.push("muted");
                    if (start && end && d > start && d < end) classes.push("in-range");
                    if (sameDay(d,start) || sameDay(d,end)) classes.push("selected");
                    return `<button class="${classes.join(" ")}" data-date="${fmt(d)}" ${inMonth? "": "disabled"}>${d.getDate()}</button>`;
                }).join("");
                $grid.innerHTML = cells;
            }
            render();

            document.getElementById('calPrev').onclick = () => { month--; if (month < 0) { month = 11; year--; } render(); };
            document.getElementById('calNext').onclick = () => { month++; if (month > 11) { month = 0; year++; } render(); };

            $grid.addEventListener('click', (e)=>{
                const btn = e.target.closest('.cal-day'); if (!btn || btn.disabled) return;
                const d = new Date(btn.dataset.date);
                if (!start || (start && end)) { start = d; end = null; } 
                else if (d < start) { end = start; start = d; } 
                else { end = d; }
                render();
            });

            document.getElementById('clearDates').onclick = () => { start = end = null; render(); };

            document.getElementById('useDates').onclick = () => {
                if (!start || !end) { alert('Please pick a start and end date'); return; }
                location.hash = `#/planner?start=${fmt(start)}&end=${fmt(end)}`;
            };
            return;
        }
    }

    function router() {
        const hash = location.hash || '#/login';
        const [path, q] = hash.split('?');
        if (path === '#/login') {
            setAuthMode(true);
            mount(Views.login());
            handleActions();
            return;
        }
        if (path === '#/signup') {
            setAuthMode(true);
            mount(Views.signup());
            handleActions();
            return;
        }
        if (path === '#/home') {
            if (!requireAuth(path)) return;
            setAuthMode(false);
            mount(Views.home());
            handleActions();
            return;
        }
        if (path === '#/planner') {
            if (!requireAuth(path)) return;
            setAuthMode(false);
            const params = parseQuery(q);
            mount(Views.planner(params));
            handleActions();
            return;
        }
        if (path === '#/profile') {
            if (!requireAuth(path)) return;
            setAuthMode(false);
            mount(Views.profile());
            handleActions();
            return;
        }
        if (path === '#/dates') {
            if (!requireAuth(path)) return;
            setAuthMode(false);
            mount(Views.dates());
            handleActions();
            return;
        }
        if (path === '#/map') {
            if (!requireAuth(path)) return;
            setAuthMode(false);
            mount(Views.map());
            handleActions();
            return;
        }        
        // Default
        location.hash = AppState.isAuthed ? '#/home' : '#/login';

        // Map view
        const mapBox = document.getElementById('mapBox');
        if (mapBox) {
            const input = document.getElementById('mapSearch');
            const useLoc = document.getElementById('useLocation');
            const openBtn = document.getElementById('openExternal');

            function buildMapURL() {
                const q = (input?.value || '').trim();
                const lat = mapBox.dataset.lat, lng = mapBox.dataset.lng;
                if (lat && lng) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                if (q)        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
                return `https://www.google.com/maps`;
            }

            // Enter 直接搜尋
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        window.open(buildMapURL(), '_blank');
                    }
                });
            }

            // 外開 Google Maps
            if (openBtn) {
                openBtn.onclick = () => window.open(buildMapURL(), '_blank');
            }

            // 使用定位
            if (useLoc) {
                useLoc.onclick = () => {
                    if (!navigator.geolocation) {
                        alert('Your browser does not support geolocation.');
                        return;
                    }
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            const { latitude, longitude } = pos.coords;
                            mapBox.dataset.lat = latitude;
                            mapBox.dataset.lng = longitude;
                            window.open(buildMapURL(), '_blank');
                        },
                        (err) => alert('Unable to get location: ' + err.message),
                        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                    );
                };
            }
            return;
        }
    }

    window.addEventListener('hashchange', router);
    window.addEventListener('DOMContentLoaded', () => {
        router();
        // Footer year
        const year = new Date().getFullYear();
        const el = document.getElementById('year');
        if (el) el.textContent = String(year);
    });
})();