// Mode aide : 8 cartes en main, quelle carte défausser ? Lancer : npm test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { CARDS, I18N, discardAdvice, playBest } = require('./helpers');

const option = (advice, cardId, to) => advice.find((o) => o.cardId === cardId && o.to === to);

describe('mode aide', () => {
  const hand = ['zeus', 'hera', 'theseus', 'atalanta', 'mount_olympus', 'palace', 'agamemnon', 'river_styx'];

  it('une option de défausse par carte, plus l’Au-delà pour les cartes qui le permettent', () => {
    const advice = discardAdvice(hand, []);
    assert.equal(advice.filter((o) => o.to === 'discard').length, 8);
    assert.deepEqual(advice.filter((o) => o.to === 'afterlife').map((o) => o.cardId), ['river_styx']);
  });

  it('chaque option vaut le meilleur score des 7 cartes restantes', () => {
    discardAdvice(hand, []).forEach(({ cardId, to, total }) => {
      const rest = hand.filter((c) => c !== cardId);
      const afterlife = to === 'afterlife' ? [cardId] : [];
      assert.equal(total, playBest(rest, afterlife).total, `${cardId} → ${to}`);
    });
  });

  it('classe les options du meilleur score au moins bon', () => {
    const totals = discardAdvice(hand, []).map((o) => o.total);
    assert.deepEqual(totals, [...totals].sort((a, b) => b - a));
  });

  it('conseille de se débarrasser du Fleuve Styx resté en main', () => {
    const [best] = discardAdvice(hand, []);
    assert.deepEqual([best.cardId, best.to], ['river_styx', 'discard']);
  });

  it('envoyer Hadès dans l’Au-delà vaut mieux que le défausser quand il y rapporte plus de 10', () => {
    const advice = discardAdvice(
      ['hades', 'theseus', 'atalanta', 'hippolyta', 'medea', 'tiresias', 'agamemnon', 'penelope'],
      ['fates', 'oracle_delphi', 'cornucopia', 'daphnes_river'],
    );
    assert.equal(option(advice, 'hades', 'afterlife').total - option(advice, 'hades', 'discard').total, 5);
  });

  it('respecte un choix fixé par le joueur', () => {
    const cards = ['moly', 'river_styx', 'cerberus', 'zeus', 'theseus', 'atalanta', 'hera', 'medea'];
    const free = option(discardAdvice(cards, []), 'medea', 'discard').total;
    const forced = option(discardAdvice(cards, [], { moly: { target: 'cerberus' } }), 'medea', 'discard').total;
    assert.ok(forced < free);
  });
});

describe('cartes défaussables vers l’Au-delà', () => {
  it('marquées exactement quand le texte français le dit', () => {
    CARDS.forEach((c) => {
      const said = I18N.fr.cards[c.id].text.includes('Peut être défaussé vers l’Au-delà');
      assert.equal(Boolean(c.toAfterlife), said, c.id);
    });
  });
});
