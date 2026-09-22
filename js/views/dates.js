import { $, esc, MONTHS, WEEKDAYS, fmt, parseDate, today, addDays, sameDay, prettyDate, nights, monthCells, legal } from '../utils.js';
import * as store from '../store.js';

export function dates(params) {
    const now = new Date();
    const tpl = params.tpl ? store.getTemplate(params.tpl) : null;

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
                    ${tpl ? `<p class="cal-tpl">${esc(tpl.emoji)} Using template <b>${esc(tpl.name)}</b> · ${tpl.nights} night(s)</p>` : ''}

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

            function draw() {
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

            $('#calBack').onclick = () => { location.hash = '#/home'; };
            $('#calPrev').onclick = () => { month--; if (month < 0) { month = 11; year--; } draw(); };
            $('#calNext').onclick = () => { month++; if (month > 11) { month = 0; year++; } draw(); };

            $('#calGrid').addEventListener('click', (e) => {
                const btn = e.target.closest('.cal-day');
                if (!btn || btn.disabled) return;
                const d = parseDate(btn.dataset.date);
                if (!start || end) {
                    start = d;
                    // 用範本時自動帶入天數
                    end = tpl && tpl.nights > 0 ? addDays(d, tpl.nights) : null;
                } else if (d < start) { end = start; start = d; }
                else { end = d; }
                draw();
            });

            $('#clearDates').onclick = () => { start = end = null; draw(); };
            $('#useDates').onclick = () => {
                if (!start || !end) return;
                location.hash = `#/planner?start=${fmt(start)}&end=${fmt(end)}${tpl ? '&tpl=' + encodeURIComponent(tpl.id) : ''}`;
            };
            draw();
        }
    };
}
