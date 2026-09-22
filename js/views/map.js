import { $, esc, replaceHash, legal } from '../utils.js';
import * as store from '../store.js';
import { PLACES, placesForCity } from '../data/places.js';
import { placeCard, wirePlaceList } from '../ui/places.js';
import { toast } from '../ui/toast.js';

// Google Maps 的 embed 端點不需要 API key；hl=en 固定英文介面與地名
const embedURL = (q) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=13&hl=en&output=embed`;

export function map(params) {
    const nextTrip = store.trips().filter(t => store.tripStatus(t) === 'upcoming').sort((a, b) => a.start.localeCompare(b.start))[0];
    const q = params.q || (nextTrip && nextTrip.city) || 'Brisbane';
    const local = placesForCity(q.split(',').pop());
    const picks = (local.length ? local : [...PLACES].sort((a, b) => b.rating - a.rating)).slice(0, 8);
    const pickTitle = local.length ? `Picks in ${local[0].city}` : 'Top picks in Queensland';

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
                    <iframe id="mapFrame" title="Map of ${esc(q)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                        src="${embedURL(q)}"></iframe>
                    <div class="map-overlay">
                        <button class="loc-btn" id="useLocation">📍 Use my location</button>
                    </div>
                </div>

                <div class="actions">
                    <button class="btn outline" id="openExternal">Open in Google Maps</button>
                </div>

                <div class="section-head">
                    <h3>${esc(pickTitle)}</h3>
                    <a class="link small" href="#/saved?tab=places">Saved ›</a>
                </div>
                <div class="place-list" id="mapPicks">
                    ${picks.map(p => placeCard(p, { compact: true })).join('')}
                </div>
                ${legal()}
            </section>
        `,
        bind() {
            const input = $('#mapSearch');
            const frame = $('#mapFrame');
            let query = q;

            const show = () => { frame.src = embedURL(query); };

            $('#mapForm').onsubmit = (e) => {
                e.preventDefault();
                const v = input.value.trim();
                if (v) replaceHash('#/map?q=' + encodeURIComponent(v));
            };
            $('#openExternal').onclick = () => window.open(`https://www.google.com/maps/search/?api=1&hl=en&query=${encodeURIComponent(query)}`, '_blank', 'noopener');
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

            const list = $('#mapPicks');
            wirePlaceList(list);
            // 點卡片本身（非按鈕）→ 在地圖上顯示
            list.addEventListener('click', (e) => {
                if (e.target.closest('[data-act]')) return;
                const card = e.target.closest('[data-place]');
                if (!card) return;
                const p = PLACES.find(x => x.id === card.dataset.place);
                query = `${p.name}, ${p.city}`;
                input.value = query;
                show();
                $('#mapBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    };
}
