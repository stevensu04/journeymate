/* Toasts are queued so reward + achievement messages don't overwrite each other */
import { $ } from '../utils.js';

const queue = [];
let busy = false;

export function toast(msg) {
    if (queue.length >= 4) queue.shift();
    queue.push(msg);
    if (!busy) next();
}

function next() {
    const el = $('#toast');
    const msg = queue.shift();
    if (!el || !msg) { busy = false; return; }
    busy = true;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(next, 220);
    }, 1600);
}
