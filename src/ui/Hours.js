// Live "Open now · until 22:00" status, computed in Buea time (Africa/Douala), refreshed
// every 30 seconds and on language change.
import { openStatus, statusText } from './format.js';
import { getLang, onLangChange } from './LangToggle.js';

function render() {
  const status = openStatus();
  const text = statusText(status, getLang());
  const state = !status.known ? 'unknown' : status.open ? 'open' : 'closed';
  for (const el of document.querySelectorAll('[data-open-state]')) el.dataset.openState = state;
  for (const el of document.querySelectorAll('[data-hours-status]')) el.textContent = text;
}

export function initHours() {
  render();
  setInterval(render, 30_000);
  onLangChange(render);
}
