/* JourneyMate Prototype App (vanilla JS, ES modules, no build step)
   - Keeps CSS/JS in separate files (per Steven's preference)
   - Four-space indentation
   - All data lives in localStorage; nothing is sent to a server
*/
import { $, $$ } from './utils.js';
import * as store from './store.js';
import { render } from './router.js';
import { initAi } from './ui/ai-panel.js';
import { toast } from './ui/toast.js';

store.onNotify(toast);

$$('#bottomNav .tab').forEach(btn => {
    btn.onclick = () => { location.hash = btn.dataset.route; };
});
$('#fabNewPlan').onclick = () => { location.hash = '#/dates'; };

initAi();
window.addEventListener('hashchange', render);

store.checkIn();
store.evaluate();
render();
