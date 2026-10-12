import { element, escapeHTML as html, listen } from './dom.js?v=08a96ee1135a';

/** A miniature of the table layout; the Celtic cross keeps its second card across the first. */
export function renderSpreadMap(spread) {
  const columns = Math.max(...spread.positions.map(position => position.column));
  const cells = spread.positions.map((position, index) => {
    const crossing = spread.layout === 'celtic' && index === 1;
    return `<i style="grid-row:${position.row};grid-column:${position.column}"${crossing ? ' class="crossing"' : ''}></i>`;
  }).join('');
  return `<span class="spread-map" style="grid-template-columns:repeat(${columns},var(--map-card))" aria-hidden="true">${cells}</span>`;
}

/** Both workflows share the same readable picker; native selects remain the source of truth. */
export function mountSpreadPicker({ spreads, signal }) {
  const dialog = element('#spread-picker-dialog');
  const list = element('#spread-picker-list');
  let target;

  function sync() {
    document.querySelectorAll('[data-spread-picker]').forEach(button => {
      const selector = element(`#${button.dataset.spreadPicker}`);
      const spread = spreads.find(item => item.id === selector.value);
      if (spread) button.innerHTML = `<span><b>${html(spread.name)}</b><small>${spread.count} 张 · ${html(spread.level)}</small></span><span class="picker-change">更换</span>`;
    });
  }
  listen(document, 'click', event => {
    const button = event.target.closest('[data-spread-picker]');
    if (!button) return;
    target = element(`#${button.dataset.spreadPicker}`);
    list.innerHTML = spreads.map(spread => `<button class="spread-choice" data-spread-choice="${html(spread.id)}" aria-pressed="${target.value === spread.id}"><span class="spread-choice-count">${renderSpreadMap(spread)}<small>${spread.count} 张</small></span><span><b>${html(spread.name)}</b><small>${html(spread.level)}</small><p>${html(spread.description)}</p></span>${target.value === spread.id ? '<span class="spread-selected">已选</span>' : ''}</button>`).join('');
    dialog.showModal();
  }, signal);
  listen(list, 'click', event => {
    const button = event.target.closest('[data-spread-choice]');
    if (!button) return;
    const selected = button.dataset.spreadChoice;
    dialog.close();
    if (target.value !== selected) {
      target.value = selected;
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sync();
  }, signal);
  listen(element('#spread-picker-close'), 'click', () => dialog.close(), signal);
  listen(document, 'spreadchange', sync, signal);
  sync();
  return { sync };
}
