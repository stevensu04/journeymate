import { $, $$, legal } from '../utils.js';
import * as store from '../store.js';
import { toast } from '../ui/toast.js';

export function login() {
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
                store.login(form.email.value.trim());
                location.hash = '#/home';
            };
            $('#forgotLink').onclick = (e) => {
                e.preventDefault();
                toast('Demo: a reset link would be emailed to you.');
            };
            $$('[data-social]').forEach(b => { b.onclick = () => toast('Social sign-in is mocked in this prototype.'); });
            $('#demoBtn').onclick = () => {
                store.login('demo@journeymate.app', 'Demo Traveler');
                location.hash = '#/home';
            };
        }
    };
}

export function signup() {
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
                store.login(form.email.value.trim(), form.name.value.trim());
                location.hash = '#/home';
            };
        }
    };
}
