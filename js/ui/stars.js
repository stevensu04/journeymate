/* Star rating display + input */
import { $$ } from '../utils.js';

export function stars(rating, { size = '' } = {}) {
    const r = Math.round(rating);
    return `<span class="stars ${size}" role="img" aria-label="${rating} out of 5">${
        [1, 2, 3, 4, 5].map(i => `<span class="${i <= r ? 'on' : ''}" aria-hidden="true">★</span>`).join('')
    }</span>`;
}

export function starInput(value = 0) {
    return `<div class="star-input" role="radiogroup" aria-label="Rating">${
        [1, 2, 3, 4, 5].map(i => `<button type="button" role="radio" aria-checked="${i === value}" aria-label="${i} star${i > 1 ? 's' : ''}" data-star="${i}" class="${i <= value ? 'on' : ''}">★</button>`).join('')
    }</div>`;
}

// 回傳 getter；點星星更新選取狀態
export function wireStarInput(root, initial = 0, onChange) {
    let value = initial;
    const btns = $$('[data-star]', root);
    const paint = () => btns.forEach(b => {
        const n = Number(b.dataset.star);
        b.classList.toggle('on', n <= value);
        b.setAttribute('aria-checked', String(n === value));
    });
    btns.forEach(b => {
        b.onclick = () => { value = Number(b.dataset.star); paint(); if (onChange) onChange(value); };
    });
    paint();
    return () => value;
}
