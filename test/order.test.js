// Ordre de résolution : masquages, icônes ajoutées, et indépendance vis-à-vis de l'ordre de saisie.
// Lancer : npm test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { CARDS, play, playBest, points, zone, tagsOf, line } = require('./helpers');

// Malus qui masquent (étape 2), avec le choix qui vise Hippolyte (MONARQUE, ROBUSTE).
const MASKS = {
  circe: {},
  lotus_field: {},
  dionysus: { dionysus: { hero: 'hippolyta' } },
};

// Bonus qui ajoutent des icônes (étape 3), avec les icônes attendues sur Hippolyte.
const ADDERS = {
  athena: { choices: { athena: { hero: 'hippolyta', tag: 'clever' } }, added: ['clever'] },
  chiron: { choices: { chiron: { hero: 'hippolyta', tag: 'clever' } }, added: ['clever'] },
  pegasus: { choices: { pegasus: { hero: 'hippolyta' } }, added: ['artistic', 'nimble'] },
  winged_sandals: { choices: { winged_sandals: { hero: 'hippolyta' } }, added: ['nimble'] },
};

describe('un malus masque les icônes, puis un bonus en ajoute', () => {
  for (const [mask, maskChoices] of Object.entries(MASKS)) {
    for (const [adder, { choices, added }] of Object.entries(ADDERS)) {
      it(`${mask} puis ${adder} : seules les icônes ajoutées restent`, () => {
        const r = play([mask, adder, 'hippolyta'], [], { ...maskChoices, ...choices });
        assert.deepEqual(tagsOf(r, 'hippolyta'), added);
      });
    }
  }

  it('une icône imprimée masquée ne protège plus d’une Créature', () => {
    assert.equal(zone(play(['lotus_field', 'antaeus', 'hippolyta']), 'hippolyta'), 'afterlife');
  });
  it('une icône rendue par un bonus protège de nouveau', () => {
    const r = play(['lotus_field', 'antaeus', 'hippolyta', 'chiron'], [], { chiron: { hero: 'hippolyta', tag: 'strong' } });
    assert.equal(zone(r, 'hippolyta'), 'hand');
  });
  it('une icône ajoutée ne rend pas le bonus masqué', () => {
    const r = play(['lotus_field', 'helen', 'ares', 'athena'], [], { athena: { hero: 'helen', tag: 'warrior' } });
    assert.equal(points(r, 'helen'), 0);
  });
  it('Dionysos : un Héros masqué qui reçoit une icône n’est plus « sans icônes »', () => {
    const r = play(['dionysus', 'theseus', 'pegasus'], [], { dionysus: { hero: 'theseus' }, pegasus: { hero: 'theseus' } });
    assert.equal(points(r, 'dionysus'), 4);
  });
});

describe('les bonus qui masquent passent avant les malus qui masquent', () => {
  for (const [mask, maskChoices] of Object.entries(MASKS)) {
    it(`Moly masque ${mask} : Hippolyte garde ses icônes`, () => {
      const r = play(['moly', mask, 'hippolyta'], [], { ...maskChoices, moly: { target: mask } });
      assert.deepEqual(tagsOf(r, 'hippolyta'), ['monarch', 'strong']);
    });
  }
});

describe('les malus qui masquent s’appliquent ensemble', () => {
  // Circé épargne les Héros si l'un d'eux est RUSÉ au début de l'étape, même si
  // Dionysos ou le Champ de lotus masquent ce RUSÉ pendant la même étape.
  it('Dionysos masque Médée, Circé voit encore son RUSÉ', () => {
    const a = play(['circe', 'dionysus', 'medea', 'helen', 'ares'], [], { dionysus: { hero: 'medea' } });
    const b = play(['dionysus', 'medea', 'helen', 'ares', 'circe'], [], { dionysus: { hero: 'medea' } });
    assert.equal(points(a, 'helen'), 12);
    assert.equal(points(b, 'helen'), 12);
  });
  it('le Champ de lotus masque tout, quel que soit l’ordre avec Circé', () => {
    const a = play(['circe', 'lotus_field', 'medea', 'helen', 'ares']);
    const b = play(['lotus_field', 'medea', 'helen', 'ares', 'circe']);
    assert.equal(points(a, 'helen'), 0);
    assert.equal(points(b, 'helen'), 0);
  });
});

// Le score ne doit jamais dépendre de l'ordre dans lequel les cartes ont été touchées.
describe('indépendance vis-à-vis de l’ordre de saisie', () => {
  const rng = (seed) => () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const shuffle = (list, random) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const tricky = [
    [['circe', 'dionysus', 'medea', 'helen', 'ares', 'athena', 'sirens'], []],
    [['herakles', 'helm_darkness', 'theseus', 'atalanta', 'minotaur', 'pomegranate', 'zeus'], ['hades']],
    [['lotus_field', 'chiron', 'pegasus', 'hippolyta', 'hydra', 'moly', 'tiresias'], []],
    [['orpheus', 'calydonian_boar', 'jason', 'hera', 'cerberus', 'sacrificial_altar', 'charmed_bridle'], ['river_lethe', 'helen']],
  ];

  const random = rng(42);
  const ids = CARDS.map((c) => c.id);
  const randomHands = Array.from({ length: 150 }, () => {
    const picked = shuffle(ids, random).slice(0, 7 + Math.floor(random() * 4));
    return [picked.slice(0, 7), picked.slice(7)];
  });

  [...tricky, ...randomHands].forEach(([hand, afterlife], i) => {
    it(`main ${i + 1} : même score dans tous les ordres`, () => {
      const expected = playBest(hand, afterlife).total;
      const local = rng(i + 1);
      for (let k = 0; k < 3; k += 1) {
        const total = playBest(shuffle(hand, local), shuffle(afterlife, local)).total;
        assert.equal(total, expected, `${hand.join(',')} | ${afterlife.join(',')}`);
      }
    });
  });
});
