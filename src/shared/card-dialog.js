import { SUIT_NAMES } from '../core/catalog.js?v=0b6360114351';
import { element, escapeHTML as html, listen } from './dom.js?v=0b6360114351';
import { renderTags, orientationLabel } from './card-view.js?v=0b6360114351';
import { GUIDE_DOMAINS } from '../core/card-guides.js?v=0b6360114351';

export function mountCardDialog(cards, signal, { guides = [], onNote } = {}) {
  const cardsById = new Map(cards.map(card => [card.id, card]));
  const dialog = element('#card-dialog');
  const content = element('#card-detail');
  const guidesById = new Map(guides.map(guide => [guide.cardId, guide]));
  let current;
  let orientation = 'upright';
  // What was actually drawn, so switching orientation never hides the reading's own result.
  let drawn = null;
  // Cards opened from "对照学习" can return to the card the reader came from.
  const trail = [];

  function renderDrawn() {
    if (!drawn) return '';
    const label = orientationLabel(drawn.orientation === 'reversed');
    return `<p class="guide-drawn">本次抽到${drawn.position ? ` · ${html(drawn.position)}` : ''} · <b>${label}</b></p>`;
  }

  function renderBack() {
    const previous = trail.at(-1);
    return previous ? `<button class="guide-back text-button" data-guide-back>← 返回${html(cardsById.get(previous.id).name)}</button>` : '';
  }

  function renderSwitch() {
    const option = (value, label) => `<button data-guide-orientation="${value}" aria-pressed="${orientation === value}">${label}${drawn?.orientation === value ? '（本次）' : ''}</button>`;
    return `<div class="orientation-switch" role="group" aria-label="切换正逆位解读">${option('upright', '正位解读')}${option('reversed', '逆位解读')}</div>`;
  }

  function renderGuide(card, guide) {
    const meaning = guide[orientation];
    return `<div class="guide-reader"><header class="guide-reader-header">${renderBack()}<nav class="guide-jump-links" aria-label="跳到牌义章节"><button data-guide-section="symbols">画面</button><button data-guide-section="meaning">核心牌义</button><button data-guide-section="domains">爱情与事业等</button><button data-guide-section="example">解读示例</button></nav></header><div class="guide-scroll"><div class="guide-layout">
      <aside class="guide-portrait"><img src="${html(card.imagePath)}" class="${orientation === 'reversed' ? 'reversed' : ''}" alt="${html(card.name)}牌面"><p class="eyebrow">${html(SUIT_NAMES[card.suit])}</p><h2 id="detail-title">${html(card.name)}</h2><p class="english">${html(card.english)}</p><div class="tags">${renderTags(card)}</div><button class="outline" data-card-note="${html(card.id)}">写学习笔记</button></aside>
      <article class="guide-content">${renderDrawn()}<p class="eyebrow">CARD STUDY · 完整牌义</p><p class="guide-intro">${html(guide.introduction)}</p>
      ${renderSwitch()}
      <h3 id="guide-symbols">先看画面</h3><div class="symbol-grid">${guide.symbols.map(symbol => `<section><h4>${html(symbol.name)}</h4><p>${html(symbol.meaning)}</p></section>`).join('')}</div>
      <section id="guide-meaning" class="meaning-overview"><h3>${orientation === 'upright' ? '正位' : '逆位'} · 核心含义</h3><p>${html(meaning.overview)}</p><p class="guide-advice"><b>可以怎样做</b> ${html(meaning.advice)}</p></section>
      <div id="guide-domains" class="domain-grid">${Object.entries(GUIDE_DOMAINS).map(([key, label]) => `<section><h4>${html(label)}</h4><p>${html(meaning[key])}</p></section>`).join('')}</div>
      <h3 id="guide-example">把牌放进问题里</h3><section class="guide-example"><h4>${html(guide.example.question)}</h4><p><b>解读依据</b> ${html(guide.example.reasoning)}</p><p><b>参考表达</b> ${html(guide.example.answer)}</p></section>
      <h3>留给自己的问题</h3><ul>${guide.questions.map(question => `<li>${html(question)}</li>`).join('')}</ul>
      <p class="guide-pitfall"><b>常见误读</b> ${html(guide.pitfall)}</p>
      <div class="related-guides"><span>对照学习</span>${guide.related.map(id => `<button class="text-button" data-detail="${html(id)}">${html(cardsById.get(id).name)} ↗</button>`).join('')}</div>
      <p class="muted guide-source">画面参考韦特牌组；以上为结合日常情境撰写的学习解读，不是唯一牌义。</p></article></div></div></div>`;
  }

  function renderBasic(card) {
    return `
      <div class="detail-layout">
        <img src="${html(card.imagePath)}" alt="${html(card.name)}牌面">
        <div>
          ${renderBack()}${renderDrawn()}
          <p class="eyebrow">${html(SUIT_NAMES[card.suit])}</p>
          <h2 id="detail-title">${html(card.name)}</h2>
          <p class="english">${html(card.english)}</p>
          <div class="tags">${renderTags(card)}</div>
          <h3>正位</h3><p>${html(card.upright)}</p>
          <h3>逆位</h3><p>${html(card.reversed)}</p>
          ${card.symbol ? `<h3>画面线索</h3><p>${html(card.symbol)}</p>` : ''}
          <h3>解读问题</h3><p>${html(card.prompt)}</p>
          <button class="outline" data-card-note="${html(card.id)}">写学习笔记</button>
        </div>
      </div>`;
  }

  function render() {
    dialog.classList.toggle('complete-guide-dialog', guidesById.has(current.id));
    content.innerHTML = guidesById.has(current.id) ? renderGuide(current, guidesById.get(current.id)) : renderBasic(current);
  }

  function open(id, selectedOrientation, position = '') {
    const card = cardsById.get(id);
    if (!card) throw new Error('没有找到牌');
    current = card;
    drawn = ['upright', 'reversed'].includes(selectedOrientation) ? { orientation: selectedOrientation, position } : null;
    orientation = drawn?.orientation ?? 'upright';
    render();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    content.querySelector('.guide-scroll')?.scrollTo({ top: 0 });
  }

  listen(document, 'click', event => {
    const button = event.target.closest('[data-detail]');
    if (!button) return;
    if (dialog.open && content.contains(button)) trail.push({ id: current.id, orientation, drawn });
    else trail.length = 0;
    open(button.dataset.detail, button.dataset.orientation, button.dataset.position);
  }, signal);
  listen(content, 'click', event => {
    const jump = event.target.closest('[data-guide-section]');
    if (jump) content.querySelector(`#guide-${jump.dataset.guideSection}`)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    if (event.target.closest('[data-guide-back]')) {
      const previous = trail.pop();
      ({ orientation, drawn } = previous);
      current = cardsById.get(previous.id);
      render();
      content.querySelector('.guide-scroll')?.scrollTo({ top: 0 });
      return;
    }
    const toggle = event.target.closest('[data-guide-orientation]');
    if (toggle && ['upright', 'reversed'].includes(toggle.dataset.guideOrientation)) {
      const scroll = content.querySelector('.guide-scroll').scrollTop;
      orientation = toggle.dataset.guideOrientation;
      render();
      content.querySelector(`[data-guide-orientation="${orientation}"]`).focus({ preventScroll: true });
      content.querySelector('.guide-scroll').scrollTop = scroll;
    }
    const note = event.target.closest('[data-card-note]');
    if (note && onNote) onNote(cardsById.get(note.dataset.cardNote), orientation === 'reversed');
  }, signal);
  listen(dialog, 'close', () => { trail.length = 0; }, signal);
  listen(element('#close-dialog'), 'click', () => dialog.close(), signal);
  listen(dialog, 'click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) dialog.close();
  }, signal);
}
