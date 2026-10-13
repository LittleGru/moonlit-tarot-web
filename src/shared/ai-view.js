import { escapeHTML as html } from './dom.js?v=0b6360114351';

export function renderTextList(items) {
  return `<ul class="ai-list">${items.map(item => `<li>${html(item)}</li>`).join('')}</ul>`;
}

export function setAIState({ button, message, result, cancel, loadingText = '正在整理反馈，请稍候…' }, state, error = '') {
  const busy = state === 'loading';
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  if (cancel) cancel.hidden = !busy;
  message.textContent = busy ? loadingText : error;
  message.dataset.state = error ? 'error' : state;
  result.hidden = true;
  result.replaceChildren();
}

export function createLatestRequest(lifetime) {
  let current;
  return {
    cancel() { current?.abort(); current = undefined; },
    start() {
      current?.abort();
      current = new AbortController();
      return AbortSignal.any([lifetime, current.signal]);
    },
  };
}
