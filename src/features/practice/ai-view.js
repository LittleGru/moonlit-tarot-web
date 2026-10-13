import { element, escapeHTML as html } from '../../shared/dom.js?v=0b6360114351';
import { setAIState, renderTextList } from '../../shared/ai-view.js?v=0b6360114351';

export function createGradingView() {
  const button = element('#grade-practice');
  const message = element('#grading-message');
  const result = element('#grading-result');
  const nodes = { button, message, result, cancel: element('#cancel-grading'), loadingText: '正在评分，请稍候…' };

  function reset() {
    setAIState(nodes, 'idle');
    button.textContent = 'AI 评分与建议';
  }

  /** Feedback stays readable while the reader revises; only its relation to the text changes. */
  function setStale(stale) {
    if (result.hidden) return;
    message.dataset.state = 'complete';
    message.textContent = stale ? '解读已修改，以上反馈针对修改前的内容，可以重新评分。' : '';
  }

  function loading() {
    setAIState(nodes, 'loading');
    button.textContent = '正在评分…';
  }

  function showError(error) {
    setAIState(nodes, 'error', error);
    button.textContent = '重试评分';
  }

  function showValidation() {
    setAIState(nodes, 'error', '请先写下至少 10 个字的解读，再查看评分。');
    button.textContent = 'AI 评分与建议';
  }

  function showResult(value, completed) {
    setAIState(nodes, 'complete');
    button.textContent = '重新评分';
    element('#practice-count').textContent = `本次练习：${completed} 题`;
    element('#practice-count').hidden = false;
    result.hidden = false;
    result.innerHTML = `
      <div class="ai-output">
        <div class="score-heading"><h3>本次解读反馈</h3><span class="score-number">${value.score}<small> / 100</small></span></div>
        <p>${html(value.summary)}</p>
        <div class="grading-criteria">
          ${value.criteria.map(item => `
            <article class="grading-criterion">
              <h4><span>${html(item.name)}</span><span>${item.score} / ${item.maximum}</span></h4>
              <p>${html(item.feedback)}</p>
            </article>`).join('')}
        </div>
        <h3>做得好的地方</h3>${renderTextList(value.strengths)}
        <h3>可以改进的地方</h3>${renderTextList(value.improvements)}
        <h3>参考改写</h3><p>${html(value.example)}</p>
        <p class="ai-note">分数用于练习反馈，不能代表占卜是否准确。同一解读的再次评分可能略有差异。</p>
      </div>`;
  }

  return { reset, loading, showError, showValidation, showResult, setStale };
}
