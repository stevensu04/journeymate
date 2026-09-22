import { $, esc, legal } from '../utils.js';
import * as store from '../store.js';
import { wireClaimButton } from '../ui/claim.js';
import { badgeGrid, wireBadges } from '../ui/badges.js';
import { confirmSheet, promptSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { render } from '../router.js';

export function profile() {
    const u = store.user();
    const name = u.name || (u.email && u.email.split('@')[0]) || 'Traveler';
    const s = store.getState();
    const count = (st) => s.trips.filter(t => store.tripStatus(t) === st).length;
    const todo = store.reviewTodo().length;

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
                        <button class="icon-btn" id="editProfileBtn" aria-label="Edit name">✏️</button>
                    </div>
                    <div class="streak-pill">🔥 ${s.streak.count}-day streak</div>
                </div>

                <div class="profile-panel">
                    <div class="card token-card">
                        <a class="token-info" href="#/wallet">
                            <div class="token-label">AI Tokens</div>
                            <div class="token-num">🪙 <span data-token-balance>${store.balance()}</span></div>
                            <div class="token-sub" data-claim-sub></div>
                        </a>
                        <button class="btn outline" id="claimDailyBtn">Get daily token</button>
                    </div>

                    <div class="stats">
                        <a class="stat" href="#/home?f=upcoming"><b>${count('upcoming')}</b><span>Upcoming</span></a>
                        <a class="stat" href="#/home?f=completed"><b>${count('completed')}</b><span>Completed</span></a>
                        <a class="stat" href="#/home?f=canceled"><b>${count('canceled')}</b><span>Canceled</span></a>
                    </div>

                    <div class="section-head">
                        <h3>Achievements</h3>
                        <span class="muted small">${s.achievements.length}/${store.ACHIEVEMENTS.length}</span>
                    </div>
                    <div id="profileBadges">${badgeGrid()}</div>

                    <nav class="list">
                        <a class="list-item" href="#/home"><span class="icon">🧳</span><span class="text">My Trips</span><span class="meta">${s.trips.length}</span><span class="chev">›</span></a>
                        <a class="list-item" href="#/saved"><span class="icon">💾</span><span class="text">Saved</span><span class="meta">${s.savedPlaces.length + s.savedTips.length + s.templates.length}</span><span class="chev">›</span></a>
                        <a class="list-item" href="#/reviews"><span class="icon">📝</span><span class="text">My Reviews</span>${todo ? `<span class="meta badge-dot">${todo} to write</span>` : `<span class="meta">${s.reviews.length}</span>`}<span class="chev">›</span></a>
                        <a class="list-item" href="#/wallet"><span class="icon">👛</span><span class="text">Wallet</span><span class="meta">🪙 <span data-token-balance>${store.balance()}</span></span><span class="chev">›</span></a>
                        <button class="list-item" id="resetDemo"><span class="icon">♻️</span><span class="text">Reset demo data</span><span class="meta"></span><span class="chev">›</span></button>
                    </nav>

                    <button class="logout-btn" id="logoutBtnInline">Log out</button>
                </div>
                ${legal()}
            </section>
        `,
        bind() {
            $('#editProfileBtn').onclick = async () => {
                const next = await promptSheet({ title: 'Edit profile', label: 'Display name', value: name });
                if (!next) return;
                store.updateName(next);
                toast('Name updated');
                render();
            };
            $('#resetDemo').onclick = async () => {
                if (!await confirmSheet('This restores the demo trips, saved places, reviews, expenses and tokens. Your current changes will be lost.', { title: 'Reset demo data', confirmLabel: 'Reset', danger: true })) return;
                store.resetDemo();
                toast('Demo data restored');
                render();
            };
            $('#logoutBtnInline').onclick = () => { store.logout(); location.hash = '#/login'; };
            wireClaimButton($('#claimDailyBtn'), render);
            wireBadges($('#profileBadges'));
        }
    };
}
