/* Bottom sheet dialog, used instead of prompt()/confirm() */
import { $, esc } from '../utils.js';

let closeCurrent = null;

export function openSheet({ title, body, onMount, onClose }) {
    closeSheet();
    const opener = document.activeElement;
    const host = $('.phone-shell') || document.body;
    const wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.innerHTML = `
        <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
            <div class="sheet-grab" aria-hidden="true"></div>
            <div class="sheet-head">
                <h3 id="sheetTitle">${esc(title)}</h3>
                <button class="sheet-close" aria-label="Close">✕</button>
            </div>
            <div class="sheet-body">${body}</div>
        </div>
    `;
    host.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));

    const onKey = (e) => { if (e.key === 'Escape') close(); };
    function close() {
        if (closeCurrent !== close) return;
        closeCurrent = null;
        document.removeEventListener('keydown', onKey);
        wrap.classList.remove('show');
        setTimeout(() => wrap.remove(), 200);
        if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
        if (onClose) onClose();
    }
    closeCurrent = close;
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    $('.sheet-close', wrap).onclick = close;

    const sheet = $('.sheet', wrap);
    if (onMount) onMount(sheet, close);
    const first = $('[autofocus]', sheet) || $('.sheet-body button, .sheet-body input, .sheet-body select, .sheet-body textarea', sheet);
    if (first) first.focus({ preventScroll: true });
    return close;
}

export function closeSheet() { if (closeCurrent) closeCurrent(); }

export function confirmSheet(message, { title = 'Are you sure?', confirmLabel = 'Confirm', danger = false } = {}) {
    return new Promise(resolve => {
        let answer = false;
        openSheet({
            title,
            body: `
                <p class="sheet-text">${esc(message)}</p>
                <div class="row two">
                    <button class="btn outline" data-no>Cancel</button>
                    <button class="btn ${danger ? 'danger' : ''}" data-yes>${esc(confirmLabel)}</button>
                </div>
            `,
            onMount(el, close) {
                $('[data-no]', el).onclick = close;
                $('[data-yes]', el).onclick = () => { answer = true; close(); };
            },
            // 點背景或 ✕ 關閉都視為取消
            onClose: () => resolve(answer)
        });
    });
}

export function promptSheet({ title, label, value = '', placeholder = '', confirmLabel = 'Save' }) {
    return new Promise(resolve => {
        let answer = null;
        openSheet({
            title,
            body: `
                <form data-form>
                    <div class="form-group">
                        <label for="sheetInput">${esc(label)}</label>
                        <input id="sheetInput" class="input" value="${esc(value)}" placeholder="${esc(placeholder)}" required autofocus />
                    </div>
                    <button class="btn" type="submit">${esc(confirmLabel)}</button>
                </form>
            `,
            onMount(el, close) {
                $('[data-form]', el).onsubmit = (e) => {
                    e.preventDefault();
                    answer = $('#sheetInput', el).value.trim() || null;
                    close();
                };
            },
            onClose: () => resolve(answer)
        });
    });
}
