import { element, escapeHTML as html } from '../../shared/dom.js?v=0b6360114351';
import { SPREAD_LEVELS } from '../../core/catalog.js?v=0b6360114351';
import { renderCardFace, renderCardCaption, renderTags, orientationLabel } from '../../shared/card-view.js?v=0b6360114351';

export const MIN_INTERPRETATION = 10;

export function createPracticeView({ aiAvailable = true } = {}) {
  const input = element('#interpretation');
  const reference = element('#reference');
  const message = element('#practice-message');
  const revealButton = element('#reveal-reference');

  function populate(spreads) {
    element('#practice-spread').innerHTML = SPREAD_LEVELS.map(level => `
      <optgroup label="${level}">${spreads.filter(spread => spread.level === level).map(spread => `
        <option value="${html(spread.id)}">${html(spread.name)} · ${spread.count} 张</option>`).join('')}
      </optgroup>`).join('');
  }

  function showExercise({ spread, reading, scenario }) {
    element('#scenario').textContent = scenario.question;
    element('#practice-spread-description').textContent = spread.description;
    element('#practice .practice-layout').dataset.multi = String(spread.count > 1);
    const table = element('#practice-card');
    table.className = `practice-cards ${spread.count === 1 ? 'single' : ''}`;
    table.innerHTML = reading.map((drawn, index) => spread.count === 1 ? `
      <div class="practice-slot">
        ${renderCardFace(drawn, spread.positions[index].name)}
        <div class="practice-card-details">
          <p class="position">${html(spread.positions[index].name)}</p>
          ${renderCardCaption(drawn)}
          <p class="practice-position-prompt">点击牌面查看完整牌义</p>
        </div>
      </div>` : `
      <div class="practice-slot">
        <p class="position"><b>${index + 1}</b> ${html(spread.positions[index].name)}</p>
        ${renderCardFace(drawn, `${index + 1} ${spread.positions[index].name}`, spread.positions[index].name)}
        ${renderCardCaption(drawn)}
        <p class="practice-position-prompt">${html(spread.positions[index].prompt)}</p>
      </div>`).join('');
    element('#practice-reading-tip').textContent = spread.readingTip;
    input.value = '';
    updateCharacterCount();
    reference.hidden = true;
    reference.replaceChildren();
    message.textContent = '';
    revealButton.disabled = false;
    revealButton.textContent = '对照参考';
  }

  function updateCharacterCount() {
    const written = input.value.trim().length;
    element('#char-count').textContent = `${written} 字`;
    const missing = MIN_INTERPRETATION - written;
    element('#practice-input-hint').textContent = !aiAvailable
      ? '写完后对照参考说明，检查自己的依据。'
      : missing > 0 ? `再写 ${missing} 个字就可以获取 AI 评分；也可以直接对照参考。` : '可以获取 AI 评分，也可以对照参考。';
  }

  function showReference({ spread, reading, scenario }, completed) {
    message.textContent = '参考说明已显示。你可以对照检查，也可以继续修改解读。';
    element('#practice-count').textContent = `本次练习：${completed} 题`;
    element('#practice-count').hidden = completed === 0;
    reference.hidden = false;
    reference.innerHTML = `
      <div class="reference">
        <p class="eyebrow">参考说明 · ${html(spread.name)}</p>
        ${reading.map(({ card, reverse }, index) => `
          <article class="practice-reference-card">
            <h3>${index + 1} · ${html(spread.positions[index].name)} · ${html(card.name)} ${orientationLabel(reverse)}</h3>
            <div class="tags">${renderTags(card)}</div>
            <p>${html(reverse ? card.reversed : card.upright)}</p>
            <p class="reflection">位置问题：${html(spread.positions[index].prompt)}</p>
          </article>`).join('')}
        <h3>串联牌阵</h3><p>${html(spread.readingTip)}</p>
        <h3>题目分析</h3><p>${html(scenario.lens)}</p>
        <h3>建议方向</h3><p>${html(scenario.action)}</p>
        <div class="self-check">
          <label><input type="checkbox">描述了具体的牌面线索与正逆位</label>
          <label><input type="checkbox">结合各位置说明了牌义与题目的联系</label>
          ${spread.count > 1 ? '<label><input type="checkbox">说明了牌与牌之间的联系</label>' : ''}
          <label><input type="checkbox">提出了具体的建议</label>
        </div>
        <p class="muted">以上为参考说明，不会对你的解读评分。可以有不同解释，但应说明依据。</p>
      </div>`;
    revealButton.textContent = '收起参考';
  }

  return { populate, showExercise, updateCharacterCount, showReference };
}
