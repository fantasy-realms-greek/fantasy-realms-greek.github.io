// Règles générales, données et traductions. Lancer : npm test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { CARDS, TAGS, SUITS, I18N, play, playBest, points, zone, tagsOf } = require('./helpers');

describe('données', () => {
  const regular = CARDS.filter((c) => !c.promo);

  it('79 cartes numérotées de 1 à 79, plus la promo', () => {
    assert.equal(regular.length, 79);
    assert.deepEqual(regular.map((c) => c.n).sort((a, b) => a - b), Array.from({ length: 79 }, (_, i) => i + 1));
    assert.deepEqual(CARDS.filter((c) => c.promo).map((c) => c.id), ['dionysus']);
  });

  it('répartition des familles du livret', () => {
    const bySuit = (suit) => regular.filter((c) => c.suit === suit).length;
    assert.deepEqual(
      { gods: bySuit('gods'), heroes: bySuit('heroes'), items: bySuit('items'), locations: bySuit('locations'), monsters: bySuit('monsters'), quests: bySuit('quests') },
      { gods: 15, heroes: 19, items: 11, locations: 12, monsters: 11, quests: 11 },
    );
  });

  it('identifiants uniques, familles et icônes connues', () => {
    assert.equal(new Set(CARDS.map((c) => c.id)).size, CARDS.length);
    CARDS.forEach((c) => {
      assert.ok(SUITS[c.suit], c.id);
      c.tags.forEach((tag) => assert.ok(TAGS.includes(tag), `${c.id}: ${tag}`));
    });
  });
});

describe('traductions', () => {
  for (const lang of Object.keys(I18N)) {
    it(`${lang} : chaque carte, famille et icône a son texte`, () => {
      const dict = I18N[lang];
      CARDS.forEach((c) => {
        assert.ok(dict.cards[c.id]?.name, `${c.id}: nom`);
        assert.equal(typeof dict.cards[c.id].text, 'string', `${c.id}: texte`);
        const scores = c.bonus || c.penalty || c.effects;
        if (scores) assert.ok(dict.cards[c.id].text, `${c.id}: texte vide alors que la carte a un effet`);
      });
      Object.keys(SUITS).forEach((suit) => assert.ok(dict.suits[suit], suit));
      TAGS.forEach((tag) => assert.ok(dict.tags[tag], tag));
    });
    it(`${lang} : mêmes clés d’interface que le français`, () => {
      assert.deepEqual(Object.keys(I18N[lang].ui).sort(), Object.keys(I18N.fr.ui).sort());
      assert.deepEqual(Object.keys(I18N[lang].choice).sort(), Object.keys(I18N.fr.choice).sort());
    });
  }
});

describe('carte masquée', () => {
  it('vaut 0 mais garde sa famille', () => {
    const r = play(['lotus_field', 'theseus', 'atalanta', 'hera']);
    assert.equal(points(r, 'theseus'), 0);
    assert.equal(points(r, 'hera'), 18);
  });
  it('un malus masqué seul ne met pas la carte à 0', () => {
    const r = play(['moly', 'river_styx', 'zeus', 'theseus'], [], { moly: { target: 'river_styx' } });
    assert.equal(points(r, 'river_styx'), 5);
  });
  it('l’oubli du Fleuve Léthé n’est pas un masquage : la valeur de base reste', () => {
    assert.equal(points(play(['ares'], ['river_lethe', 'helen']), 'helen'), 2);
  });
});

describe('Au-delà', () => {
  it('−10 par carte dans l’Au-delà', () => {
    assert.equal(play(['zeus'], ['cornucopia', 'oracle_delphi']).afterlifeScore, -20);
    assert.equal(play(['zeus'], ['cornucopia', 'oracle_delphi']).total, 8 + 2 + 7 - 20);
  });
  it('les cartes de l’Au-delà gardent valeur, icônes et bonus', () => {
    const r = play(['achilles'], ['helen']);
    assert.equal(points(r, 'helen'), 12);
  });
  it('les cartes envoyées en fin de partie comptent dans le −10', () => {
    assert.equal(play(['sirens', 'atalanta', 'theseus']).afterlifeScore, -20);
  });
  it('total = somme des cartes + Au-delà', () => {
    const r = play(['zeus', 'hades'], ['fates']);
    assert.equal(r.total, r.cards.reduce((s, c) => s + c.total, 0) + r.afterlifeScore);
  });
});

describe('ordre de fin de partie', () => {
  it('les bonus qui masquent (facultatifs) passent avant les malus qui masquent', () => {
    const r = play(['moly', 'circe', 'helen', 'ares'], [], { moly: { target: 'circe' } });
    assert.equal(points(r, 'helen'), 12);
  });
  it('les icônes sont ajoutées après les malus qui masquent', () => {
    const r = play(['circe', 'athena', 'theseus'], [], { athena: { hero: 'theseus', tag: 'clever' } });
    assert.deepEqual(tagsOf(r, 'theseus'), ['clever']);
    assert.equal(points(r, 'athena'), 12); // Thésée (Rusé ajouté) et Circé (Sage)
  });
  it('une icône ajoutée n’empêche pas un malus de masquer déjà appliqué', () => {
    const r = play(['circe', 'athena', 'helen', 'ares'], [], { athena: { hero: 'helen', tag: 'clever' } });
    assert.equal(points(r, 'helen'), 0);
  });
  it('les icônes ajoutées protègent des malus de fin de partie', () => {
    const r = play(['athena', 'sirens', 'theseus'], [], { athena: { hero: 'theseus', tag: 'clever' } });
    assert.equal(zone(r, 'theseus'), 'hand');
  });
  it('une carte n’a jamais deux fois la même icône', () => {
    const r = play(['chiron', 'athena', 'medea'], [], {
      chiron: { hero: 'medea', tag: 'clever' },
      athena: { hero: 'medea', tag: 'clever' },
    });
    assert.deepEqual(tagsOf(r, 'medea'), ['clever', 'magic']);
  });
  it('plusieurs Créatures : chacune doit être satisfaite', () => {
    assert.equal(zone(play(['sirens', 'minotaur', 'medea']), 'medea'), 'hand');
    assert.equal(zone(play(['sirens', 'antaeus', 'medea']), 'medea'), 'afterlife');
  });
  it('les bonus se calculent après les envois dans l’Au-delà', () => {
    const r = play(['sirens', 'atalanta', 'long_journey', 'oracle_delphi']);
    assert.equal(points(r, 'long_journey'), 0);
  });
});

describe('meilleurs choix', () => {
  const hands = [
    [['athena', 'medea', 'theseus', 'sirens'], []],
    [['moly', 'river_styx', 'cerberus', 'zeus'], []],
    [['herakles', 'tiresias', 'helen', 'ares', 'hera'], []],
    [['chiron', 'pegasus', 'winged_sandals', 'hippolyta', 'hydra', 'oracle_delphi', 'temple'], []],
    [['dionysus', 'helen', 'theseus', 'lotus_field'], ['atalanta']],
  ];
  it('jamais moins bien que les choix par défaut', () => {
    hands.forEach(([hand, afterlife]) => {
      assert.ok(playBest(hand, afterlife).total >= play(hand, afterlife).total, hand.join(','));
    });
  });
  it('respecte un choix fixé par le joueur', () => {
    const r = playBest(['moly', 'river_styx', 'cerberus'], [], { moly: { target: 'cerberus' } });
    assert.equal(r.choices.moly.target, 'cerberus');
    assert.equal(points(r, 'river_styx'), -20);
  });
  it('« aucun » fixé par le joueur est respecté', () => {
    const r = playBest(['moly', 'river_styx'], [], { moly: { target: null } });
    assert.equal(points(r, 'river_styx'), -20);
  });
});

// Mains d'exemple publiées par GeekDad (février 2026), valeurs carte par carte.
describe('exemples publiés', () => {
  it('main 1 : 124 points', () => {
    const r = play(['theseus', 'artemis', 'golden_apples', 'minotaur', 'antaeus', 'labyrinth', 'epic_quest']);
    assert.deepEqual(
      Object.fromEntries(r.cards.map((c) => [c.inst.card.id, c.total])),
      { theseus: 10, artemis: 21, golden_apples: 17, minotaur: 15, antaeus: 18, labyrinth: 13, epic_quest: 30 },
    );
    assert.equal(r.total, 124);
  });

  // L'article annonce 82, mais ses propres valeurs par carte donnent 102.
  it('main 2 : Sirènes et Grenade envoient Atalante, Hippolyte et Hermès dans l’Au-delà', () => {
    const r = play(
      ['sirens', 'calydonian_boar', 'zeus', 'dryads', 'hermes', 'atalanta', 'hippolyta'],
      ['hades', 'cerberus', 'sacrificial_altar', 'pomegranate'],
      { pomegranate: { god: 'hermes' } },
    );
    ['atalanta', 'hippolyta', 'hermes'].forEach((id) => assert.equal(zone(r, id), 'afterlife', id));
    assert.equal(points(r, 'zeus'), 20);
    assert.equal(points(r, 'hades'), 21);
    assert.equal(points(r, 'hermes'), 20);
    assert.equal(points(r, 'cerberus'), 15);
    assert.equal(points(r, 'sacrificial_altar'), 14);
    assert.equal(r.afterlifeScore, -70);
    assert.equal(r.total, 102);
  });
});
