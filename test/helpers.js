// Charge les scripts du site (sans navigateur) et fournit des raccourcis pour les tests.
const fs = require('fs');
const path = require('path');

const load = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const site = new Function('window', `
  ${load('i18n/fr.js')}
  ${load('i18n/en.js')}
  ${load('js/cards.js')}
  ${load('js/scoring.js')}
  return { I18N, CARDS, TAGS, SUITS, scoreHand, bestChoices, choiceSlots, discardAdvice };
`)(globalThis);

const play = (hand, afterlife = [], choices = {}) => site.scoreHand(hand, afterlife, choices);
const playBest = (hand, afterlife = [], fixed = {}) => {
  const choices = site.bestChoices(hand, afterlife, fixed);
  return { ...play(hand, afterlife, choices), choices };
};

const line = (result, id) => {
  const found = result.cards.find((c) => c.inst.card.id === id);
  if (!found) throw new Error(`carte absente : ${id}`);
  return found;
};

const points = (result, id) => line(result, id).total;
const zone = (result, id) => line(result, id).inst.zone;
const tagsOf = (result, id) => [...line(result, id).inst.tags].sort();

module.exports = { ...site, play, playBest, line, points, zone, tagsOf };
