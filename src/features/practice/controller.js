import { confirmAction } from '../../shared/confirmation.js?v=08a96ee1135a';
import { createPracticeSession } from '../../core/practice.js?v=08a96ee1135a';
import { element, listen } from '../../shared/dom.js?v=08a96ee1135a';
import { createPracticeView, MIN_INTERPRETATION } from './view.js?v=08a96ee1135a';
import { createGradingView } from './ai-view.js?v=08a96ee1135a';
import { createLatestRequest } from '../../shared/ai-view.js?v=08a96ee1135a';
import { requestAI } from '../../shared/ai-client.js?v=08a96ee1135a';
import { validateGrade, validateScenario } from '../../core/ai-contract.js?v=08a96ee1135a';

export function mountPractice({ cards, spreads, scenarios, signal, aiAvailable = true, onSave }) {
  const session = createPracticeSession(cards, scenarios, spreads);
  const view = createPracticeView({ aiAvailable });
  const reversed = element('#practice-reversed');
  const includeReversed = () => reversed.checked;
  // The text the visible AI feedback was written for.
  let gradedText = null;
  const grading = createGradingView();
  const request = createLatestRequest(signal);
  const questionRequest = createLatestRequest(signal);
  const aiQuestionButton = element('#ai-new-practice');
  const questionMessage = element('#scenario-generation-message');
  const recentQuestions = [];
  let exerciseId;
  let feedback = null;
  function cancelQuestion() {
    questionRequest.cancel();
    aiQuestionButton.disabled = false;
    aiQuestionButton.removeAttribute('aria-busy');
    questionMessage.textContent = '';
  }
  const input = element('#interpretation');
  const selector = element('#practice-spread');
  view.populate(spreads);

  function start() {
    cancelQuestion();
    request.cancel();
    grading.reset();
    const exercise = session.start(includeReversed(), selector.value);
    exerciseId = crypto.randomUUID(); feedback = null; gradedText = null;
    view.showExercise(exercise);
    document.dispatchEvent(new Event('spreadchange'));
    return {
      spreadId: exercise.spread.id,
      cards: exercise.reading.map(({ card, reverse }, index) => ({
        id: card.id, name: card.name, orientation: reverse ? 'reversed' : 'upright',
        position: exercise.spread.positions[index].name,
      })),
      question: exercise.scenario.question,
    };
  }

  async function generateQuestion() {
    if (!aiAvailable) return;
    request.cancel();
    grading.reset();
    const spreadId = selector.value;
    const pending = questionRequest.start();
    aiQuestionButton.disabled = true;
    aiQuestionButton.setAttribute('aria-busy', 'true');
    questionMessage.textContent = '正在根据牌阵出题…';
    try {
      const value = await requestAI('scenario', { spreadId,
        previousQuestions: recentQuestions.slice(-3) }, pending);
      const scenario = validateScenario(value.scenario);
      if (typeof value.scenarioToken !== 'string' || !value.scenarioToken) throw new Error('练习题目格式不完整');
      if (pending.aborted || selector.value !== spreadId) return;
      const exercise = session.startGenerated(includeReversed(), spreadId, scenario, value.scenarioToken);
      exerciseId = crypto.randomUUID(); feedback = null; gradedText = null;
      view.showExercise(exercise);
      recentQuestions.push(scenario.question);
      if (recentQuestions.length > 3) recentQuestions.shift();
      questionMessage.textContent = 'AI 情境练习 · 完成后可查看参考或评分。';
    } catch (error) {
      if (!pending.aborted) questionMessage.textContent = error.name === 'AbortError' ? '' : `${error.message} 当前题目仍可继续练习。`;
    } finally {
      if (!pending.aborted) {
        aiQuestionButton.disabled = false;
        aiQuestionButton.removeAttribute('aria-busy');
      }
    }
  }

  async function grade() {
    if (!aiAvailable) return;
    if (aiQuestionButton.disabled) cancelQuestion();
    if (!session.exercise) start();
    const interpretation = input.value.trim();
    if (interpretation.length < MIN_INTERPRETATION) {
      grading.showValidation();
      input.focus();
      return;
    }
    const exercise = session.exercise;
    const pending = request.start();
    feedback = null;
    gradedText = null;
    grading.loading();
    try {
      const value = validateGrade(await requestAI('grade', {
        spreadId: exercise.spread.id,
        cards: exercise.reading.map(({ card, reverse }) => ({ id: card.id, reverse })),
        ...(exercise.scenarioToken ? { scenarioToken: exercise.scenarioToken } : { scenarioIndex: exercise.scenarioIndex }),
        interpretation,
      }, pending));
      if (pending.aborted) return;
      feedback = value;
      gradedText = interpretation;
      session.reveal(interpretation);
      grading.showResult(value, session.completed);
      grading.setStale(input.value.trim() !== gradedText);
    } catch (error) {
      if (!pending.aborted) {
        if (error.name === 'AbortError') grading.reset();
        else grading.showError(error.message);
      }
    }
  }

  function reveal() {
    if (aiQuestionButton.disabled) cancelQuestion();
    if (!session.exercise) start();
    session.reveal(input.value);
    if (!element('#reference').hidden) {
      element('#reference').hidden = true; element('#reveal-reference').textContent = '对照参考'; return true;
    }
    view.showReference(session.exercise, session.completed);
    element('#reference').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  async function mayReplaceExercise() {
    return !input.value.trim() || await confirmAction({ title: '开始新练习？', message: '当前解读不会带到下一题。需要保留的话，可以先记到笔记。', confirmLabel: '开始新练习', cancelLabel: '继续当前练习' });
  }
  listen(selector, 'change', async () => {
    if (await mayReplaceExercise()) start();
    else { selector.value = session.exercise.spread.id; document.dispatchEvent(new Event('spreadchange')); }
  }, signal);
  listen(reversed, 'change', async () => {
    if (await mayReplaceExercise()) start();
    else reversed.checked = !reversed.checked;
  }, signal);
  listen(element('#cancel-grading'), 'click', () => { request.cancel(); grading.reset(); }, signal);
  listen(element('#new-practice'), 'click', async () => { if (await mayReplaceExercise()) start(); }, signal);
  listen(aiQuestionButton, 'click', async () => { if (await mayReplaceExercise()) await generateQuestion(); }, signal);
  listen(element('#reveal-reference'), 'click', reveal, signal);
  listen(element('#grade-practice'), 'click', grade, signal);
  listen(element('#save-practice'), 'click', async () => {
    if (!session.exercise || !onSave) return;
    const button = element('#save-practice');
    button.disabled = true;
    const { spread, reading, scenario } = session.exercise;
    try {
      await onSave({ id: exerciseId, kind: 'practice', spreadId: spread.id, spreadName: spread.name,
        question: scenario.question, cards: reading.map(({ card, reverse }, index) => ({ id: card.id, reverse, position: spread.positions[index].name })), feedback: gradedText === input.value.trim() ? feedback : null }, input.value);
    } catch (error) { element('#practice-message').textContent = error.message; }
    finally { button.disabled = false; }
  }, signal);
  listen(input, 'input', () => {
    // Do not replace an exercise underneath someone who started writing.
    if (aiQuestionButton.disabled) cancelQuestion();
    if (gradedText !== null) grading.setStale(input.value.trim() !== gradedText);
    else if (!element('#grade-practice').disabled) grading.reset();
    view.updateCharacterCount();
  }, signal);
  return {
    start,
    enter() { if (!session.exercise) start(); },
  };
}
