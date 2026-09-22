/* Write / edit a review for a trip or a place */
import { $, $$, esc } from '../utils.js';
import * as store from '../store.js';
import { openSheet, confirmSheet } from './sheet.js';
import { starInput, wireStarInput } from './stars.js';
import { toast } from './toast.js';
import { render } from '../router.js';

export function openReviewSheet(type, ref) {
    const existing = store.getReview(type, ref);
    const name = store.reviewTargetName(type, ref);
    const rewarded = store.getState().ledger.some(e => e.kind === 'review' && e.ref === `${type}:${ref}`);
    const min = store.REVIEW_MIN_CHARS;

    openSheet({
        title: existing ? `Edit review` : `Review ${name}`,
        body: `
            <form data-review-form>
                ${existing ? `<p class="sheet-text"><b>${esc(name)}</b></p>` : ''}
                <div class="form-group">
                    <label>Your rating</label>
                    ${starInput(existing ? existing.rating : 0)}
                </div>
                <div class="form-group">
                    <label>Tags</label>
                    <div class="tag-picker">
                        ${store.REVIEW_TAGS.map(tag => `
                            <button type="button" class="tag ${existing && existing.tags.includes(tag) ? 'on' : ''}" data-tag="${esc(tag)}" aria-pressed="${Boolean(existing && existing.tags.includes(tag))}">${esc(tag)}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label for="reviewText">What was it like?</label>
                    <textarea id="reviewText" class="input" rows="4" maxlength="600" placeholder="Tips for other travellers, what you loved, what to skip…">${esc(existing ? existing.text : '')}</textarea>
                    <div class="field-hint" id="reviewHint"></div>
                </div>
                <p class="form-error" id="reviewError" role="alert" hidden></p>
                <button class="btn" type="submit">${existing ? 'Save review' : 'Post review'}</button>
                ${existing ? '<button type="button" class="btn ghost-danger" data-delete>Delete review</button>' : ''}
            </form>
        `,
        onMount(el, close) {
            const getRating = wireStarInput(el, existing ? existing.rating : 0, () => { $('#reviewError', el).hidden = true; });
            const text = $('#reviewText', el);
            const hint = $('#reviewHint', el);

            const updateHint = () => {
                const n = text.value.trim().length;
                if (rewarded) hint.textContent = `${n} characters`;
                else if (n >= min) hint.innerHTML = `${n} characters · <b>earns 🪙1</b>`;
                else hint.textContent = `${n}/${min} characters to earn 🪙1`;
            };
            text.oninput = updateHint;
            updateHint();

            $$('[data-tag]', el).forEach(b => {
                b.onclick = () => {
                    const on = b.classList.toggle('on');
                    b.setAttribute('aria-pressed', String(on));
                };
            });

            $('[data-review-form]', el).onsubmit = (e) => {
                e.preventDefault();
                const rating = getRating();
                if (!rating) {
                    const err = $('#reviewError', el);
                    err.textContent = 'Please pick a star rating.';
                    err.hidden = false;
                    return;
                }
                const tags = $$('[data-tag].on', el).map(b => b.dataset.tag);
                close();
                store.saveReview({ type, ref, rating, tags, text: text.value });
                toast(existing ? 'Review updated' : 'Review posted');
                render();
            };

            const del = $('[data-delete]', el);
            if (del) del.onclick = async () => {
                if (!await confirmSheet(`Delete your review of ${name}?`, { confirmLabel: 'Delete', danger: true })) return;
                store.deleteReview(existing.id);
                toast('Review deleted');
                render();
            };
        }
    });
}
