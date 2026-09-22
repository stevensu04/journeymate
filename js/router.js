/* Hash router: #/path?query → view({ html, bind }) */
import { $, $$, currentRoute, currentParams } from './utils.js';
import * as store from './store.js';
import { closeAi } from './ui/ai-panel.js';
import { closeSheet } from './ui/sheet.js';
import { refreshTokenUI } from './ui/claim.js';
import { login, signup } from './views/auth.js';
import { home } from './views/home.js';
import { dates } from './views/dates.js';
import { planner } from './views/planner.js';
import { map } from './views/map.js';
import { profile } from './views/profile.js';
import { saved } from './views/saved.js';
import { reviews } from './views/reviews.js';
import { wallet } from './views/wallet.js';

const ROUTES = {
    '#/login':   { view: login,   auth: false, title: 'Sign in' },
    '#/signup':  { view: signup,  auth: false, title: 'Sign up' },
    '#/home':    { view: home,    auth: true,  title: 'MyJourney' },
    '#/dates':   { view: dates,   auth: true,  title: 'Select dates' },
    '#/planner': { view: planner, auth: true,  title: 'Planner' },
    '#/map':     { view: map,     auth: true,  title: 'Map' },
    '#/profile': { view: profile, auth: true,  title: 'Profile' },
    '#/saved':   { view: saved,   auth: true,  title: 'Saved' },
    '#/reviews': { view: reviews, auth: true,  title: 'My Reviews' },
    '#/wallet':  { view: wallet,  auth: true,  title: 'Wallet' }
};

let lastHash = '';

// 重新渲染目前頁面；同一個網址重繪時保留捲動位置（例如按愛心）
export function render() {
    const path = currentRoute();
    const route = ROUTES[path];
    const authed = store.isAuthed();

    if (!route) { location.replace(authed ? '#/home' : '#/login'); return; }
    if (route.auth && !authed) { location.replace('#/login'); return; }
    if (!route.auth && authed) { location.replace('#/home'); return; }

    const view = route.view(currentParams());
    if (view.redirect) { location.replace(view.redirect); return; }

    document.body.classList.toggle('auth', !route.auth);
    $('#bottomNav').hidden = !route.auth;
    $('#aiFab').hidden = !route.auth;

    const root = $('#appRoot');
    const sameView = location.hash === lastHash;
    const scroll = root.scrollTop;
    if (!sameView) { closeAi(); closeSheet(); }

    root.innerHTML = view.html;
    root.scrollTop = sameView ? scroll : 0;
    lastHash = location.hash;
    view.bind();
    refreshTokenUI();

    $$('#bottomNav .tab').forEach(b => {
        const on = b.dataset.match.split(' ').includes(path);
        b.classList.toggle('active', on);
        if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.title = `${route.title} · JourneyMate`;
}
