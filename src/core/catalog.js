export const SUIT_NAMES = Object.freeze({
  major: '大阿尔卡那',
  wands: '权杖',
  cups: '圣杯',
  swords: '宝剑',
  pentacles: '星币',
});
export const SPREAD_LEVELS = ['入门', '进阶', '深入'];
const LAYOUTS = new Set(['single', 'line', 'fork', 'mirror', 'grid', 'week', 'celtic']);

function entries(document, key) {
  if (document?.schemaVersion !== 1 || !Array.isArray(document[key]) ||
      !document[key].length) {
    throw new Error(`${key} 资料格式无效`);
  }
  return document[key];
}

function requireText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateCards(document) {
  const cards = entries(document, 'cards');
  const ids = new Set();
  for (const card of cards) {
    const validRank = card.suit === 'major'
      ? card.rank >= 0 && card.rank <= 21
      : card.rank >= 1 && card.rank <= 14;
    const expectedPath = `cards/${card.suit}-${String(card.rank).padStart(2, '0')}.jpg`;
    if (!Object.hasOwn(SUIT_NAMES, card.suit) || !Number.isInteger(card.rank) ||
        !validRank || card.id !== `${card.suit}-${card.rank}` || ids.has(card.id) ||
        !['name', 'english', 'upright', 'reversed', 'prompt'].every(key => requireText(card[key])) ||
        !Array.isArray(card.keywords) || !card.keywords.length ||
        !card.keywords.every(requireText) || typeof card.symbol !== 'string' ||
        card.imagePath !== expectedPath) {
      throw new Error('牌组定义无效');
    }
    ids.add(card.id);
  }
  return cards;
}

export function validateSpreads(document) {
  const spreads = entries(document, 'spreads');
  const ids = new Set();
  for (const spread of spreads) {
    if (!/^[a-z]+$/.test(spread.id) || ids.has(spread.id) ||
        !['name', 'description', 'example', 'readingTip'].every(key => requireText(spread[key])) ||
        !SPREAD_LEVELS.includes(spread.level) || !LAYOUTS.has(spread.layout) ||
        !Number.isInteger(spread.count) || spread.count < 1 || spread.count > 78 ||
        !Array.isArray(spread.positions) || spread.positions.length !== spread.count) {
      throw new Error('牌阵定义无效');
    }
    ids.add(spread.id);
    for (const position of spread.positions) {
      if (!requireText(position.name) || !requireText(position.prompt) ||
          !Number.isInteger(position.row) || position.row < 1 ||
          !Number.isInteger(position.column) || position.column < 1) {
        throw new Error('牌阵位置无效');
      }
    }
    if (spread.sourceNote && (!requireText(spread.sourceNote) ||
        !/^https:\/\//.test(spread.sourceUrl))) {
      throw new Error('牌阵资料来源无效');
    }
  }
  return spreads;
}

export function validateScenarios(document) {
  const scenarios = entries(document, 'scenarios');
  if (!scenarios.every(scenario => ['question', 'lens', 'action']
    .every(key => requireText(scenario[key])) && (!scenario.spreadIds ||
      (Array.isArray(scenario.spreadIds) && scenario.spreadIds.length && scenario.spreadIds.every(id => /^[a-z]+$/.test(id)))))) {
    throw new Error('练习题目无效');
  }
  return scenarios;
}

/** Other common Chinese translations, so readers of different books still find the card. */
const MAJOR_ALIASES = Object.freeze({
  0: ['愚者'], 1: ['魔法师'], 2: ['女教皇'], 3: ['女皇'], 5: ['教宗', '祭司长'],
  9: ['隐士'], 10: ['命运'], 12: ['吊人', '倒吊者'], 13: ['死亡'], 15: ['魔鬼'], 16: ['塔'],
  17: ['星'], 20: ['审判日'],
});
const SUIT_ALIASES = Object.freeze({
  wands: ['权杖', '木杖', '棍'], cups: ['圣杯', '杯'], swords: ['宝剑', '剑'], pentacles: ['星币', '金币', '钱币', '五角星'],
});
const COURT_ALIASES = Object.freeze({ 1: ['王牌', '一', 'ace'], 11: ['侍从', '侍者', '国王侍从'], 12: ['骑士'], 13: ['王后', '皇后', '女王'], 14: ['国王'] });
const ROMAN = ['0', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx', 'xxi'];
const compact = text => text.toLowerCase().replace(/\s+/g, '');

function cardNames(card) {
  if (card.suit === 'major') return [card.name, ...(MAJOR_ALIASES[card.rank] ?? [])];
  const ranks = COURT_ALIASES[card.rank] ?? [];
  const numbers = card.rank <= 10 ? [String(card.rank)] : [];
  return SUIT_ALIASES[card.suit].flatMap(suit => [...ranks, ...numbers].map(rank => `${suit}${rank}`));
}

export function searchCards(cards, { suit = 'all', query = '' } = {}) {
  const term = compact(query);
  // A bare number or Roman numeral is a card number, not a substring of "10".
  const number = /^\d+$/.test(term) ? Number(term) : ROMAN.indexOf(term) > 0 ? ROMAN.indexOf(term) : null;
  // "圣杯1" must not also find "圣杯10".
  const pattern = /\d$/.test(term) ? new RegExp(`${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\d)`) : null;
  return cards.filter(card => {
    if (suit !== 'all' && suit !== card.suit) return false;
    if (number !== null) return card.rank === number && (/^\d+$/.test(term) || card.suit === 'major');
    const text = [card.name, card.english, card.upright, ...card.keywords, ...cardNames(card)].map(compact).join('|');
    return pattern ? pattern.test(text) : text.includes(term);
  });
}
